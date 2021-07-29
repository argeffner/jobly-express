"use strict";

const request = require("supertest");

const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
  testJobIds
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
    const newJob = {
        companyHandle: "c1",
        title: "newJob",
        salary: 1000,
        equity: "0.2",
    };
    test("not Admin", async function () {
      const resp = await request(app)
          .post("/jobs")
          .send(newJob)
          .set("authorization", `Bearer ${u1Token}`);
      expect(resp.statusCode).toEqual(401);
    });
  
    test("admin only", async function () {
      const resp = await request(app)
          .post("/jobs")
          .send(newJob)
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(201);
      expect(resp.body).toEqual({
        job: {
          id: expect.any(Number),
          title: "newJob",
          salary: 1000,
          equity: "0.2",
          companyHandle: "c1",
        }
      });
    });
    test("bad request with missing data", async function () {
      const resp = await request(app)
          .post("/jobs")
          .send({
            companyHandle: "c1",
          })
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(400);
    });
  
    test("bad request with invalid data", async function () {
      const resp = await request(app)
          .post("/jobs")
          .send({
            companyHandle: "c1",
            title: "newJob",
            salary: '1000',
            equity: "0.2",
          })
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(400);
    });
  });
  
  /************************************** GET /jobs */

  describe("GET /jobs", function () {
    test("ok for anon", async function () {
      const resp = await request(app).get("/jobs");
      expect(resp.body).toEqual({
        jobs: [
              {
                id: expect.any(Number),
                title: "Job1",
                salary: 100,
                equity: "0.1",
                companyHandle: "c1",
                companyName: "C1",
              },
              {
                id: expect.any(Number),
                title: "Job2",
                salary: 200,
                equity: "0.2",
                companyHandle: "c2",
                companyName: "C2",
              },
              {
                id: expect.any(Number),
                title: "Job3",
                salary: 300,
                equity: null,
                companyHandle: "c3",
                companyName: "C3",
              },
            ],
      });
    });
    test("works: filtering", async function () {
      const resp = await request(app)
          .get("/jobs")
          .query({ equityCheck: true });
      expect(resp.body).toEqual({
        jobs: [
            {
                id: expect.any(Number),
                title: "Job1",
                salary: 100,
                equity: "0.1",
                companyHandle: "c1",
                companyName: "C1",
              },
              {
                id: expect.any(Number),
                title: "Job2",
                salary: 200,
                equity: "0.2",
                companyHandle: "c2",
                companyName: "C2",
              },
        ],
      });
    });
    test("works: multiple filters", async function () {
      const resp = await request(app)
          .get("/jobs")
          .query({ minSalary: 200, title: "3" });
      expect(resp.body).toEqual({
        jobs: [
            {
                id: expect.any(Number),
                title: "Job3",
                salary: 300,
                equity: null,
                companyHandle: "c3",
                companyName: "C3",
              },
        ],
      });
    });
    test("fail: bad request wrong filter key", async function () {
      const resp = await request(app)
          .get("/jobs")
          .query({ minSalary: 2, random: "nonsense" });
      expect(resp.statusCode).toEqual(400);
    });
  });

  /************************************** GET /jobs/:id */

  describe("GET /jobs/:id", function () {
    test("works for anon", async function () {
      const resp = await request(app).get(`/jobs/${testJobIds[0]}`);
      expect(resp.body).toEqual({
        job: {
          id: testJobIds[0],
          title: "Job1",
          salary: 100,
          equity: '0.1',
          company: {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
        },
      });
    });
    test("not found for no such company", async function () {
      const resp = await request(app).get(`/jobs/10000`);
      expect(resp.statusCode).toEqual(404);
    });
  });

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
    test("works for admin", async function () {
      const resp = await request(app)
          .patch(`/jobs/${testJobIds[0]}`)
          .send({
            title: "newjob",
          })
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.body).toEqual({
        job: {
          id: expect.any(Number),
          title: 'newJob',
          salary: 100,
          equity: '0.1',
          companyHandle: 'c1'
        },
      });
    });
    test("unauth for rest", async function () {
      const resp = await request(app)
          .patch(`/jobs/${testJobIds[0]}`)
          .send({
            title: "newJob",
          })
          .set("authorization", `Bearer ${u1Token}`);
      expect(resp.statusCode).toEqual(401);
    });
    test("not found on no such job", async function () {
      const resp = await request(app)
          .patch(`/jobs/100000`)
          .send({
            title: "new nope",
          })
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(400);
    });
  
    test("bad request on handle change attempt", async function () {
      const resp = await request(app)
          .patch(`/jobs/${testJobIds[0]}`)
          .send({
            handle: "new",
          })
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(400);
    });
  
    test("bad request on invalid data", async function () {
      const resp = await request(app)
          .patch(`/jobs/${testJobIds[0]}`)
          .send({
            salary: "not-a-num",
          })
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(400);
    });
  });

  /************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
    test("works for admin", async function () {
      const resp = await request(app)
          .delete(`/jobs/${testJobIds[0]}`)
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.body).toEqual({ deleted: testJobIds[0] });
    });
    
    test("not an admin", async function () {
      const resp = await request(app)
          .delete(`/jobs/${testJobIds[0]}`)
          .set("authorization", `Bearer ${u1Token}`);
      expect(resp.statusCode).toEqual(401);
    });
  
    test("unauth for anon", async function () {
      const resp = await request(app)
          .delete(`/jobs/${testJobIds[0]}`);
      expect(resp.statusCode).toEqual(401);
    });
  
    test("not found for no such company", async function () {
      const resp = await request(app)
          .delete(`/jobs/10000}`)
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(404);
    });
  });
