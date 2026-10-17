
"use strict";

// Phase 19.4: READ-ONLY Payment & Refund Tests
// No payment, refund, or booking mutations.

const { test } = require("node:test");
const assert = require("node:assert/strict");

const BASE = (
  process.env.TEST_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const CUSTOMER = process.env.TEST_CUSTOMER_COOKIE || "";
const ADMIN = process.env.TEST_ADMIN_COOKIE || "";

async function get(path, cookie = "") {
  const headers = {
    Accept: "application/json",
  };

  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetch(BASE + path, {
    method: "GET",
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });

  let body;

  try {
    body = await response.json();
  } catch {
    assert.fail(
      `Non-JSON response from ${path} (HTTP ${response.status})`
    );
  }

  return { response, body };
}

function expect(result, code) {
  assert.equal(
    result.response.status,
    code,
    JSON.stringify(result.body)
  );
}

function list(result) {
  expect(result, 200);

  assert.equal(result.body.success, true);

  assert.ok(
    Array.isArray(result.body.data),
    "Expected data array"
  );

  return result.body.data;
}

function checkPayments(rows) {
  for (const p of rows) {
    assert.ok(
      [
        "created",
        "paid",
        "failed",
        "refund_pending",
        "partially_refunded",
        "refunded",
      ].includes(p.status),
      `Unknown payment status ${p.status}`
    );

    assert.ok(
      Number.isInteger(p.amountPaise) && p.amountPaise > 0,
      `Invalid amountPaise ${p._id}`
    );

    const refundAmount = p.refundAmountPaise ?? 0;

    assert.ok(
      Number.isInteger(refundAmount) &&
        refundAmount >= 0 &&
        refundAmount <= p.amountPaise,
      `Invalid refund amount ${p._id}`
    );

    if (p.booking && typeof p.booking === "object") {
      if (typeof p.booking.totalAmount === "number") {
        assert.ok(
          Math.abs(
            p.amountPaise -
              Math.round(p.booking.totalAmount * 100)
          ) <= 1,
          `Booking/payment amount mismatch ${p._id}`
        );
      }

      if (p.status === "refunded") {
        assert.equal(
          p.booking.status,
          "cancelled",
          `Refunded payment booking not cancelled ${p._id}`
        );
      }

      if (p.status === "paid") {
        assert.equal(
          p.booking.status,
          "confirmed",
          `Paid payment booking not confirmed ${p._id}`
        );
      }
    }
  }
}

// TEST 1
test("Anonymous cannot read own payments", async () => {
  expect(await get("/api/payments/my"), 401);
});

// TEST 2
test("Anonymous cannot read admin payments", async () => {
  expect(await get("/api/payments/admin"), 401);
});

// TEST 3
test("Anonymous cannot read invoice", async () => {
  expect(
    await get(
      "/api/payments/invoice/507f1f77bcf86cd799439011"
    ),
    401
  );
});

// TEST 4
test(
  "Anonymous cannot read admin refund reconciliation endpoint",
  async () => {
    // GET only: never trigger refund reconciliation.
    const result = await get(
      "/api/payments/admin/reconcile-refund/507f1f77bcf86cd799439011"
    );

    assert.notEqual(
      result.response.status,
      200,
      "Unexpected public GET reconciliation access"
    );
  }
);

// TEST 5 - FIXED
test("Unknown payments route is not exposed", async () => {
  const result = await get(
    "/api/payments/__phase19_unknown__"
  );

  // 401: Authentication middleware blocked the request.
  // 404: Unknown route was not found.
  assert.ok(
    [401, 404].includes(result.response.status),
    `Unexpected HTTP status: ${result.response.status}`
  );

  assert.equal(
    result.body.success,
    false,
    "Unknown route must not return success"
  );
});

// TEST 6
test(
  "Customer can read own payments and amounts",
  {
    skip: !CUSTOMER && "Set TEST_CUSTOMER_COOKIE",
  },
  async () => {
    const rows = list(
      await get("/api/payments/my", CUSTOMER)
    );

    checkPayments(rows);
  }
);

// TEST 7
test(
  "Customer cannot read admin payments",
  {
    skip: !CUSTOMER && "Set TEST_CUSTOMER_COOKIE",
  },
  async () => {
    expect(
      await get("/api/payments/admin", CUSTOMER),
      403
    );
  }
);

// TEST 8
test(
  "Admin can read payments and reconcile statuses",
  {
    skip: !ADMIN && "Set TEST_ADMIN_COOKIE",
  },
  async () => {
    const rows = list(
      await get("/api/payments/admin", ADMIN)
    );

    checkPayments(rows);

    const counts = {};

    for (const p of rows) {
      counts[p.status] =
        (counts[p.status] || 0) + 1;
    }

    console.log(
      "Read-only payment status counts:",
      counts
    );
  }
);
