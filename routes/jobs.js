"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");
// need job schemas
const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobSearchSchema = require("../schemas/jobSearch.json")

const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * job should be { id, title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: login
 * change to admin only    enusreLoggedIn => ensureAdmin
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** GET / =>
 *   { jobs: [ { id, title, salary, equity, companyHandle, companyName }, ...] }
 *
 * Can provide search filter in query:
 * - minSalary
 * - hasEquity (true returns only jobs with equity > 0, other values ignored)
 * - title (will find case-insensitive, partial matches)

 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
    // set query search params outside of try and catch
    // make sure to convert the string number to a number '5' => 5    +string => number
    const quer = req.query;
    if (quer.minSalary !== undefined) quer.minSalary = +quer.minSalary;
    quer.equityCheck = quer.equityEquity === 'true';
    try {
      const validator = jsonschema.validate(quer, jobSearchSchema);
      if (!validator.valid) {
        const errs = validator.errors.map(e => e.stack);
        throw new BadRequestError(errs);
      }
      const companies = await Company.findAll(quer);
      return res.json({ jobs });
    } catch (err) {
      return next(err);
    }
});

  /** GET /[jobId] => { job }
   *
   * Returns { id, title, salary, equity, company }
   *   where company is { handle, name, description, numEmployees, logoUrl }
   *
   * Authorization required: none
   */

router.get("/:id", async function (req, res, next) {
    try {
      const job = await Job.get(req.params.id);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
});

/** PATCH /[jobId]  { fld1, fld2, ... } => { job }
 *
 * Data can include: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */

router.patch("/:id", ensureAdmin, async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, jobUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map(e => e.stack);
        throw new BadRequestError(errs);
      }
  
      const job = await Job.update(req.params.id, req.body);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
});

/** DELETE /[handle]  =>  { deleted: id }
 *
 * Authorization required: admin
 */

router.delete("/:id", ensureAdmin, async function (req, res, next) {
    try {
      await Job.remove(req.params.id);
      // turn number string into integer
      return res.json({ deleted: +req.params.id });
    } catch (err) {
      return next(err);
    }
});
  
  
module.exports = router;
