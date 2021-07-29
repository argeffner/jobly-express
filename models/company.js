"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * 
   * Includes a filter for min, max and employees name
   * */

  static async findAll(filteredQuerries = {}) { 
    let query = `SELECT handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"
                 FROM companies`;
    
    // add array of querries to sql and filter with WHERE array
    let queryVals = []; 
    let sqlWhere = [];

    const {minEmployees, maxemployees, name} = filteredQuerries;
    // make sure min is never greater than max
    if (minEmployees > maxemployees) {
      throw new BadRequestError("Can't have more Min than Max Employees")
    }

    // now organize data for SQL with queryVals array and sqlWHere array
    // set WHERE num_employees <= $ querarray.length
    if (minEmployees !== undefined) {
      queryVals.push(minEmployees);
      sqlWhere.push(`num_employees <= $${queryVals.length}`)
    }
    if (maxEmployees !== undefined) {
      queryVals.push(maxEmployees);
      sqlWhere.push(`num_employees <= $${queryVals.length}`)
    }
    if (name) {
      queryVals.push(`%${name}%`);
      sqlWhere.push(`name ILIKE $${queryVals.length}`)
    }
    if (sqlWhere.length > 0) {
      // for WHERE clause need to add AND foreach num_Employees <= $number
      query += " WHERE " + sqlWhere.join(" AND ");
      // returns WHERE num_Employees <= $1 AND num_Employees <= $3 etc
    }
    //  after filteredquerries is finished add ORDER BY name and return the rows
    query += "ORDER BY name";
    const companiesRes = await db.query(query, queryVals);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const jobRes = await db.query(
          `SELECT id, title, salary, equity
           FROM jobs
           WHERE company_handle = $1
           ORDER BY id`, [handle]);

    company.jobs = jobRes.rows;

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
