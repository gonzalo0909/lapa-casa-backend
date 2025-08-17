"use strict";
/**
 * /services/sheets.js
 * - fetchRowsFromSheet(): lee filas desde GAS Web App (?mode=rows)
 * - calcOccupiedBeds(rows, fromISO, toISO, holdsMap, bufferPerRoom): ocupa camas por rango
 * - notifySheets(payload): POST a BOOKINGS_WEBAPP_URL (payment_update/upsert)
 */

const ROWS_URL = String(process.env.BOOKINGS_WEBAPP_URL || "").trim();
const BUFFER_PER_ROOM = Number(process.env.BOOKING_BUFFER_PER_ROOM || 0);

function parseISO(s){ return new Date(String(s).slice(0,10)+"T00:00:00Z"); }
function overlap(aStart,aEnd,bStart,bEnd){ return aStart < bEnd && bStart < aEnd; }

async function fetchRowsFromSheet() {
  if (!ROWS_URL) throw new Error("BOOKINGS_WEBAPP_URL_missing");
  const url = ROWS_URL + (ROWS_URL.includes("?") ? "&" : "?") + "mode=rows";
  const res = await fetch(url, { headers:{ "Accept":"application/json" }});
  const j = await res.json();
  if (!res.ok || !j || j.ok !== true || !Array.isArray(j.rows)) {
    throw new Error("rows_fetch_error");
  }
  return j.rows.map(r => ({
    booking_id: String(r.booking_id||""),
    entrada: String(r.entrada||""),
    salida:  String(r.salida||""),
    camas_json: String(r.camas_json||""),
    pay_status: String(r.pay_status||""),
    total: Number(r.total||0)
  }));
}

/**
 * rows: [{entrada, salida, camas_json, pay_status}]
 * fromISO/toISO: "YYYY-MM-DD"
 * holdsMap: { "1": Set, "3": Set, "5": Set, "6": Set }
 */
function calcOccupiedBeds(rows, fromISO, toISO, holdsMap = {}, bufferPerRoom = BUFFER_PER_ROOM) {
  const from = parseISO(fromISO);
  const to   = parseISO(toISO);

  const occupied = { "1": new Set(), "3": new Set(), "5": new Set(), "6": new Set() };

  for (const r of rows) {
    const a = r.entrada ? parseISO(r.entrada) : null;
    const b = r.salida  ? parseISO(r.salida)  : null;
    if (!a || !b || !(a<b)) continue;
    if (!overlap(a,b,from,to)) continue;

    let camas = {};
    try { camas = r.camas_json ? JSON.parse(r.camas_json) : {}; } catch {}
    for (const roomId of Object.keys(camas||{})) {
      (camas[roomId]||[]).forEach(bed => occupied[roomId]?.add(Number(bed)));
    }
  }

  // buffer por cuarto
  if (bufferPerRoom > 0) {
    for (const roomId of Object.keys(occupied)) {
      let added = 0, bed = 1;
      while (added < bufferPerRoom && bed <= 60) {
        if (!occupied[roomId].has(bed)) { occupied[roomId].add(bed); added++; }
        bed++;
      }
    }
  }

  // overlay holds
  for (const roomId of Object.keys(holdsMap||{})) {
    const set = holdsMap[roomId];
    if (set && set.forEach) set.forEach(bed => occupied[roomId]?.add(Number(bed)));
  }

  const out = {};
  for (const k of Object.keys(occupied)) out[k] = Array.from(occupied[k]).sort((a,b)=>a-b);
  return out;
}

async function notifySheets(payload) {
  if (!ROWS_URL) throw new Error("BOOKINGS_WEBAPP_URL_missing");
  const res = await fetch(ROWS_URL, {
    method: "POST",
    headers: { "Content-Type":"application/json", "Accept":"application/json" },
    body: JSON.stringify(payload || {})
  });
  const j = await res.json().catch(()=> ({}));
  if (!res.ok || !j) throw new Error("sheets_notify_error");
  return j;
}

module.exports = { fetchRowsFromSheet, calcOccupiedBeds, notifySheets };
