"use strict";
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ ok: true, events: [] });
});

module.exports = router;
