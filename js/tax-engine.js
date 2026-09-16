// Tax engine for ITR-1 — AY 2026-27
// Implements slab calculation, rebate u/s 87A, and cess
// following the CBDT Validation Rules for ITR-1 AY 2026-27.

// --- Slab rates ---
// NOTE: Verify these against the latest official slab notification
// for AY 2026-27 before relying on this for real filings.

function calcSlabTaxOldRegime(totalIncome) {
  let tax = 0;
  if (totalIncome <= 250000) {
    tax = 0;
  } else if (totalIncome <= 500000) {
    tax = (totalIncome - 250000) * 0.05;
  } else if (totalIncome <= 1000000) {
    tax = 12500 + (totalIncome - 500000) * 0.20;
  } else {
    tax = 112500 + (totalIncome - 1000000) * 0.30;
  }
  return Math.round(tax);
}

function calcSlabTaxNewRegime(totalIncome) {
  // New regime slabs (post Budget changes) — verify against
  // official notification for the exact AY you're supporting.
  const slabs = [
    { upto: 300000, rate: 0 },
    { upto: 700000, rate: 0.05 },
    { upto: 1000000, rate: 0.10 },
    { upto: 1200000, rate: 0.15 },
    { upto: 1500000, rate: 0.20 },
    { upto: Infinity, rate: 0.30 }
  ];
  let tax = 0;
  let lower = 0;
  for (const slab of slabs) {
    if (totalIncome > lower) {
      const taxableInSlab = Math.min(totalIncome, slab.upto) - lower;
      tax += taxableInSlab * slab.rate;
      lower = slab.upto;
    } else {
      break;
    }
  }
  return Math.round(tax);
}

// Rule 23 / 191 / 192: Rebate u/s 87A
function calcRebate87A(totalIncome, taxBeforeRebate, oldRegime) {
  if (oldRegime) {
    // Old regime: rebate up to Rs.12,500 if total income <= 5,00,000
    if (totalIncome <= 500000) {
      return Math.min(taxBeforeRebate, 12500);
    }
    return 0;
  } else {
    // New regime: full rebate if total income <= 12,70,590 (per rule 191)
    if (totalIncome <= 1270590) {
      return Math.min(taxBeforeRebate, taxBeforeRebate); // full rebate up to tax payable
    }
    return 0;
  }
}

// Rule 26: Cess = 4% of (Tax after Rebate)
function calcCess(taxAfterRebate) {
  return Math.round(taxAfterRebate * 0.04);
}

function computeTaxITR1(parsed) {
  const totalIncome = parsed.income.totalIncome;
  const oldRegime = parsed.filing.oldRegime;

  const slabTax = oldRegime
    ? calcSlabTaxOldRegime(totalIncome)
    : calcSlabTaxNewRegime(totalIncome);

  const rebate = calcRebate87A(totalIncome, slabTax, oldRegime);
  const taxAfterRebate = Math.max(0, slabTax - rebate);
  const cess = calcCess(taxAfterRebate);
  const grossTaxLiability = taxAfterRebate + cess;
  const relief89 = parsed.taxComp.relief89 || 0;
  const netTaxLiability = Math.max(0, grossTaxLiability - relief89);

  const totalTaxesPaid = parsed.taxPaid.total;
  const totalTaxPlusInterest = netTaxLiability + (parsed.taxComp.interestPayable || 0);

  const refundOrPayable = totalTaxesPaid - totalTaxPlusInterest;

  return {
    slabTax,
    rebate,
    taxAfterRebate,
    cess,
    grossTaxLiability,
    relief89,
    netTaxLiability,
    totalTaxPlusInterest,
    totalTaxesPaid,
    refundDue: refundOrPayable > 0 ?
