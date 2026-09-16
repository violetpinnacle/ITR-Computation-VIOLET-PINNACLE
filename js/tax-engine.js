// Tax engine for ITR-1 — AY 2026-27
// Slab rates per Finance Act 2025 (Section 115BAC for new regime).
// Old regime slabs unchanged from prior years.
// Source verified: legalclarity.org/indian-income-tax-slabs-new-and-old-regime-rates
// Always cross-check against official incometax.gov.in notification before real filing use.

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
  // AY 2026-27 new regime — 7 slabs, basic exemption raised to Rs.4,00,000
  const slabs = [
    { upto: 400000,  rate: 0 },
    { upto: 800000,  rate: 0.05 },
    { upto: 1200000, rate: 0.10 },
    { upto: 1600000, rate: 0.15 },
    { upto: 2000000, rate: 0.20 },
    { upto: 2400000, rate: 0.25 },
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

// Rebate u/s 87A
function calcRebate87A(totalIncome, taxBeforeRebate, oldRegime) {
  if (oldRegime) {
    // Old regime: rebate up to Rs.12,500 if total income <= 5,00,000
    if (totalIncome <= 500000) {
      return Math.min(taxBeforeRebate, 12500);
    }
    return 0;
  } else {
    // New regime AY 2026-27: rebate up to Rs.60,000 if total income <= 12,00,000
    if (totalIncome <= 1200000) {
      return Math.min(taxBeforeRebate, 60000);
    }
    // Marginal relief zone: income between 12,00,001 and ~12,75,000
    // Tax payable cannot exceed (income - 12,00,000)
    if (totalIncome > 1200000 && taxBeforeRebate > (totalIncome - 1200000)) {
      return taxBeforeRebate - (totalIncome - 1200000);
    }
    return 0;
  }
}

// Cess = 4% of (Tax after Rebate)
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
    refundDue: refundOrPayable > 0 ? refundOrPayable : 0,
    balancePayable: refundOrPayable < 0 ? Math.abs(refundOrPayable) : 0
  };
}
