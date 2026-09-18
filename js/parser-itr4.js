// Parses a raw ITR-4 (Sugam) JSON object into a flat, simple structure
// that the tax engine (tax-engine.js, shared with ITR-1) and the ITR-4
// renderer can use safely.
//
// NOTE ON FIELD NAMES:
// The official e-Filing JSON schema for ITR-4 has changed slightly across
// utility versions, and some values (Personal Info, Filing Status) are
// nested differently than in ITR-1. To stay robust, every value below is
// looked up using a LIST of possible paths (tryPaths) instead of a single
// path - the first path that actually exists in the uploaded file wins.
// If your real downloaded JSON uses a field name not listed here, the
// value will simply show as 0 / blank - it will not crash the page.

function safeGet(obj, path, fallback) {
  try {
    const parts = path.split('.');
    let val = obj;
    for (const p of parts) {
      if (val === undefined || val === null) return fallback;
      val = val[p];
    }
    return (val === undefined || val === null) ? fallback : val;
  } catch (e) {
    return fallback;
  }
}

// Tries each path in order against `obj`, returns the first one that
// resolves to something other than `fallback`.
function tryPaths(obj, paths, fallback) {
  for (const p of paths) {
    const v = safeGet(obj, p, undefined);
    if (v !== undefined) return v;
  }
  return fallback;
}

function parseITR4(rawData) {
  const itr4 = rawData.ITR.ITR4;

  const personal = {
    firstName: tryPaths(itr4, [
      'PersonalInfo.AssesseeName.FirstName',
      'PartA_GEN1.PersonalInfo.AssesseeName.FirstName'
    ], ''),
    surName: tryPaths(itr4, [
      'PersonalInfo.AssesseeName.SurNameOrOrgName',
      'PartA_GEN1.PersonalInfo.AssesseeName.SurNameOrOrgName'
    ], ''),
    pan: tryPaths(itr4, [
      'PersonalInfo.PAN',
      'PartA_GEN1.PersonalInfo.PAN'
    ], ''),
    aadhaar: tryPaths(itr4, [
      'PersonalInfo.AadhaarCardNo',
      'PartA_GEN1.PersonalInfo.AadhaarCardNo'
    ], ''),
    dob: tryPaths(itr4, [
      'PersonalInfo.DOB',
      'PartA_GEN1.PersonalInfo.DOB'
    ], ''),
    city: tryPaths(itr4, [
      'PersonalInfo.Address.CityOrTownOrDistrict',
      'PartA_GEN1.PersonalInfo.Address.CityOrTownOrDistrict'
    ], ''),
    pin: tryPaths(itr4, [
      'PersonalInfo.Address.PinCode',
      'PartA_GEN1.PersonalInfo.Address.PinCode'
    ], ''),
    status: tryPaths(itr4, [
      'PartA_GEN1.Status',
      'FilingStatus.AssesseeStatus',
      'PartA_GEN1.FilingStatus.AssesseeStatus'
    ], 'Individual')
  };

  const filing = {
    assessmentYear: tryPaths(itr4, [
      'Form_ITR4.AssessmentYear',
      'PartA_GEN1.Form_ITR4.AssessmentYear'
    ], ''),
    filingSection: tryPaths(itr4, [
      'FilingStatus.ReturnFileSec',
      'PartA_GEN1.FilingStatus.ReturnFileSec'
    ], ''),
    dueDate: tryPaths(itr4, [
      'FilingStatus.ItrFilingDueDate',
      'PartA_GEN1.FilingStatus.ItrFilingDueDate'
    ], ''),
    oldRegime: tryPaths(itr4, [
      'FilingStatus.OptOutNewTaxRegime',
      'PartA_GEN1.FilingStatus.OptOutNewTaxRegime'
    ], 'N') === 'Y'
  };

  // ---- Salary (same shape as ITR-1) ----
  const salary = {
    grossSalary: tryPaths(itr4, ['ITR4_IncomeDeductions.GrossSalary'], 0),
    allowancesExempt: tryPaths(itr4, ['ITR4_IncomeDeductions.AllwncExemptUs10.TotalAllwncExemptUs10'], 0),
    netSalary: tryPaths(itr4, ['ITR4_IncomeDeductions.NetSalary'], 0),
    stdDeduction16ia: tryPaths(itr4, ['ITR4_IncomeDeductions.DeductionUs16ia'], 0),
    professionalTax16iii: tryPaths(itr4, ['ITR4_IncomeDeductions.ProfessionalTaxUs16iii'], 0),
    incomeFromSalary: tryPaths(itr4, ['ITR4_IncomeDeductions.IncomeFromSal'], 0)
  };

  // ---- Presumptive Business / Profession Income ----
  // Section 44AD - small business
  const p44AD = {
    grossTurnover: tryPaths(itr4, [
      'ITR4_IncomeDeductions.PresumptiveIncome44AD.GrossTurnoverOrGrossReceipt44AD',
      'PresumptiveIncome44AD.GrossTurnoverOrGrossReceipt44AD',
      'ITR4_IncomeDeductions.PresumpIncome44AD.GrossTurnover44AD'
    ], 0),
    presumptiveIncome: tryPaths(itr4, [
      'ITR4_IncomeDeductions.PresumptiveIncome44AD.TotPresumptiveIncome44AD',
      'PresumptiveIncome44AD.TotPresumptiveIncome44AD',
      'ITR4_IncomeDeductions.PresumpIncome44AD.TotPresumpIncome44AD'
    ], 0)
  };

  // Section 44ADA - professionals (confirmed schema key: PersumptiveInc44ADA)
  const p44ADA = {
    grossReceipts: tryPaths(itr4, [
      'ITR4_IncomeDeductions.PersumptiveInc44ADA.GrsReceipt',
      'PersumptiveInc44ADA.GrsReceipt',
      'ITR4_IncomeDeductions.PresumptiveIncome44ADA.GrossReceipts44ADA'
    ], 0),
    presumptiveIncome: tryPaths(itr4, [
      'ITR4_IncomeDeductions.PersumptiveInc44ADA.TotPersumptiveInc44ADA',
      'PersumptiveInc44ADA.TotPersumptiveInc44ADA',
      'ITR4_IncomeDeductions.PresumptiveIncome44ADA.TotPresumptiveIncome44ADA'
    ], 0)
  };

  // Section 44AE - goods carriages / transporters
  const p44AE = {
    presumptiveIncome: tryPaths(itr4, [
      'ITR4_IncomeDeductions.PresumptiveIncome44AE.TotPresumptiveIncome44AE',
      'PresumptiveIncome44AE.TotPresumptiveIncome44AE',
      'ITR4_IncomeDeductions.PresumpIncome44AE.TotPresumpIncome44AE'
    ], 0)
  };

  // Total presumptive business/profession income: prefer an explicit
  // "total" field from the JSON, otherwise fall back to summing the three.
  const businessIncomeExplicit = tryPaths(itr4, [
    'ITR4_IncomeDeductions.IncomeFromBP',
    'ITR4_IncomeDeductions.PresumptiveBusinessIncome'
  ], undefined);
  const incomeFromBusiness = businessIncomeExplicit !== undefined
    ? Number(businessIncomeExplicit)
    : (Number(p44AD.presumptiveIncome) + Number(p44ADA.presumptiveIncome) + Number(p44AE.presumptiveIncome));

  const income = {
    ...salary,
    presumptive44AD: p44AD,
    presumptive44ADA: p44ADA,
    presumptive44AE: p44AE,
    incomeFromBusiness: incomeFromBusiness,
    incomeFromHouseProperty: tryPaths(itr4, ['ITR4_IncomeDeductions.TotalIncomeOfHP'], 0),
    incomeFromOtherSources: tryPaths(itr4, ['ITR4_IncomeDeductions.IncomeOthSrc'], 0),
    grossTotalIncome: tryPaths(itr4, ['ITR4_IncomeDeductions.GrossTotIncome'], 0),
    totalIncome: tryPaths(itr4, ['ITR4_IncomeDeductions.TotalIncome'], 0)
  };

  const viaRaw = tryPaths(itr4, ['ITR4_IncomeDeductions.DeductUndChapVIA'], {});
  const deductions = {
    sec80C: viaRaw.Section80C || 0,
    sec80CCC: viaRaw.Section80CCC || 0,
    sec80CCD1: viaRaw.Section80CCDEmployeeOrSE || 0,
    sec80CCD1B: viaRaw.Section80CCD1B || 0,
    sec80CCD2: viaRaw.Section80CCDEmployer || 0,
    sec80D: viaRaw.Section80D || 0,
    sec80DD: viaRaw.Section80DD || 0,
    sec80DDB: viaRaw.Section80DDB || 0,
    sec80E: viaRaw.Section80E || 0,
    sec80EE: viaRaw.Section80EE || 0,
    sec80EEA: viaRaw.Section80EEA || 0,
    sec80EEB: viaRaw.Section80EEB || 0,
    sec80G: viaRaw.Section80G || 0,
    sec80GG: viaRaw.Section80GG || 0,
    sec80GGA: viaRaw.Section80GGA || 0,
    sec80GGC: viaRaw.Section80GGC || 0,
    sec80TTA: viaRaw.Section80TTA || 0,
    sec80TTB: viaRaw.Section80TTB || 0,
    sec80U: viaRaw.Section80U || 0,
    total: viaRaw.TotalChapVIADeductions || 0
  };

  const taxComp = {
    totalTaxPayable: tryPaths(itr4, ['ITR4_TaxComputation.TotalTaxPayable'], 0),
    rebate87A: tryPaths(itr4, ['ITR4_TaxComputation.Rebate87A'], 0),
    taxAfterRebate: tryPaths(itr4, ['ITR4_TaxComputation.TaxPayableOnRebate'], 0),
    cess: tryPaths(itr4, ['ITR4_TaxComputation.EducationCess'], 0),
    grossTaxLiability: tryPaths(itr4, ['ITR4_TaxComputation.GrossTaxLiability'], 0),
    relief89: tryPaths(itr4, ['ITR4_TaxComputation.Section89'], 0),
    netTaxLiability: tryPaths(itr4, ['ITR4_TaxComputation.NetTaxLiability'], 0),
    interestPayable: tryPaths(itr4, ['ITR4_TaxComputation.TotalIntrstPay'], 0),
    totalTaxAndInterest: tryPaths(itr4, ['ITR4_TaxComputation.TotTaxPlusIntrstPay'], 0)
  };

  const taxPaid = {
    tds: tryPaths(itr4, ['TaxPaid.TaxesPaid.TDS'], 0),
    tcs: tryPaths(itr4, ['TaxPaid.TaxesPaid.TCS'], 0),
    advanceTax: tryPaths(itr4, ['TaxPaid.TaxesPaid.AdvanceTax'], 0),
    selfAssessmentTax: tryPaths(itr4, ['TaxPaid.TaxesPaid.SelfAssessmentTax'], 0),
    total: tryPaths(itr4, ['TaxPaid.TaxesPaid.TotalTaxesPaid'], 0),
    balancePayable: tryPaths(itr4, ['TaxPaid.BalTaxPayable'], 0)
  };

  const refund = {
    refundDue: tryPaths(itr4, ['Refund.RefundDue'], 0)
  };

  return { personal, filing, income, deductions, taxComp, taxPaid, refund };
}
