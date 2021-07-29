"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {NotFoundError} = require("../expressError");

class Job {
    /** Create a job (from data), update db, return new company data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle}
   *
   * */

  static async create({ data }) {
    const result = await db.query(
          `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
        [
          data.title,
          data.salary,
          data.equity,
          data.companyHandle
        ],
    );
    const job = result.rows[0];

    return job;
  }
  
  /** Find all jobs and has filter.
   *
   * filter includes min salary, equity check, and title 
   * 
   * Returns [{ id, title, salary, equity, companyHandle, CompnayName }, ...]
   * */

   static async findAll({minSalary, equityCheck, title} = {}) { 
    let query = `SELECT jobs.id,
                        jobs.title,
                        jobs.salary,
                        jobs.equity,
                        jobs.company_handle AS "companyHandle",
                        companies.name AS "companyName"
                 FROM jobs
                 LEFT JOIN companies ON companies.handle = jobs.compnay_handle`;
    
    // add array of querries to sql and filter with WHERE array
    let queryVals = []; 
    let sqlWhere = [];


    // now organize data for SQL with queryVals array and sqlWHere array
    // set WHERE num_employees <= $ querarray.length
    if (minSalary !== undefined) {
      queryVals.push(minSalary);
      sqlWhere.push(`num_employees <= $${queryVals.length}`)
    }
    if (equityCheck === true) {
        sqlWhere.push(`equity > 0`)
      }
    if (title) {
      queryVals.push(`%${title}%`);
      sqlWhere.push(`name ILIKE $${queryVals.length}`)
    }
    if (sqlWhere.length > 0) {
      query += " WHERE " + sqlWhere.join(" AND ");
    }
    //  after filteredquerries is finished add ORDER BY title and return the rows
    query += "ORDER BY title";
    const companiesRes = await db.query(query, queryVals);
    return companiesRes.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle, company }
   *   where company is { handle, name, description, numEmployees, logoUrl }
   *
   * Throws NotFoundError if not found.
   **/

   static async get(id) {
    const jobRes = await db.query(
          `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`, [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

//  Connect jobs.companyHandle to companies.handle
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`, [job.companyHandle]);

    delete job.companyHandle;
    job.company = companiesRes.rows[0];

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

   static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {});
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                title,
                                salary, 
                                equity, 
                                comapny_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

   static async remove(id) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`, [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;