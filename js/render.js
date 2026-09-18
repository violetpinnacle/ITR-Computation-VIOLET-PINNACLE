// Renders the ITR-1 computation sheet into the page in a formal,
// CA-software-style layout (bordered, centered title, no watermark).

function formatCurrency(num) {
  const n = Number(num) || 0;
  return '₹' + n.toLocaleString('en-IN');
}

function formatAadhaar(num) {
  const clean = (num || '').toString().replace(/\D/g, '');
  if (clean.length !== 12) return num || '';
  return clean.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
}

function lineRow(label, amount, opts) {
  opts = opts || {};
  const cls = opts.indent ? 'indent' : '';
  const boldCls = opts.bold ? 'row-bold' : '';
  return `<tr class="${boldCls}">
    <td class="${cls}">${label}</td>
    <td class="amount">${opts.blank ? '' : formatCurrency(amount)}</td>
  </tr>`;
}

function deductionRow(label, amount) {
  if (!amount || amount === 0) return '';
  return `<tr><td class="indent">${label}</td><td class="amount">${formatCurrency(amount)}</td></tr>`;
}

function renderComputationITR1(parsed, computed) {
  const container = document.getElementById('outputSection');

  if (computed.error) {
    container.innerHTML = `
      <div class="comp-sheet">
        <p style="color:#b00020; font-weight:bold;">${computed.message}</p>
        <div class="no-print" style="margin-top:16px;">
          <button onclick="location.reload()">Upload Another File</button>
        </div>
      </div>
    `;
    return;
  }

  const fullName = (parsed.personal.firstName + ' ' + parsed.personal.surName).trim();
  const regimeLabel = parsed.filing.oldRegime ? 'Old Regime' : 'New Regime (Sec 115BAC)';
  const ayLabel = `${parsed.filing.assessmentYear}-${(parseInt(parsed.filing.assessmentYear) + 1).toString().slice(-2)}`;
  const finYear = (parseInt(parsed.filing.assessmentYear) - 1) + '-' + parseInt(parsed.filing.assessmentYear).toString().slice(-2);

  container.innerHTML = `
    <div class="comp-sheet" id="printArea" oncopy="return false" oncontextmenu="return false" onselectstart="return false">
      <div class="sheet-title">
        <h2>Computation of Total Income and Tax Payable</h2>
        <p class="sub-title">Assessment Year ${ayLabel} &nbsp;|&nbsp; Financial Year ${finYear}</p>
      </div>

      <table class="info-table">
        <tr>
          <td class="info-label">Name of Assessee</td><td>:</td><td>${fullName}</td>
          <td class="info-label">PAN</td><td>:</td><td>${parsed.personal.pan}</td>
        </tr>
        <tr>
          <td class="info-label">Status</td><td>:</td><td>Individual</td>
          <td class="info-label">Assessment Year</td><td>:</td><td>${ayLabel}</td>
        </tr>
        <tr>
          <td class="info-label">Aadhaar No.</td><td>:</td><td>${formatAadhaar(parsed.personal.aadhaar)}</td>
          <td class="info-label">Regime Opted</td><td>:</td><td>${regimeLabel}</td>
        </tr>
      </table>

      <table class="comp-table">
        <tr class="section-head"><th colspan="2">Computation of Total Income</th></tr>

        <tr><td colspan="2"><strong>Income from Salary</strong></td></tr>
        ${lineRow('Gross Salary', parsed.income.grossSalary, { indent: true })}
        ${lineRow('Less: Allowances Exempt u/s 10', parsed.income.allowancesExempt, { indent: true })}
        ${lineRow('Net Salary', parsed.income.netSalary, { indent: true })}
        ${lineRow('Less: Standard Deduction u/s 16(ia)', parsed.income.stdDeduction16ia, { indent: true })}
        ${lineRow('Less: Professional Tax u/s 16(iii)', parsed.income.professionalTax16iii, { indent: true })}
        ${lineRow('Income from Salary', parsed.income.incomeFromSalary, { bold: true })}

        ${lineRow('Income from House Property', parsed.income.incomeFromHouseProperty)}
        ${lineRow('Income from Other Sources', parsed.income.incomeFromOtherSources)}
        ${lineRow('Gross Total Income', parsed.income.grossTotalIncome, { bold: true })}

        <tr><td colspan="2"><strong>Less: Deductions under Chapter VI-A</strong></td></tr>
        ${deductionRow('Section 80C', parsed.deductions.sec80C)}
        ${deductionRow('Section 80CCD(1B)', parsed.deductions.sec80CCD1B)}
        ${deductionRow('Section 80D', parsed.deductions.sec80D)}
        ${deductionRow('Section 80E', parsed.deductions.sec80E)}
        ${deductionRow('Section 80G', parsed.deductions.sec80G)}
        ${deductionRow('Section 80TTA', parsed.deductions.sec80TTA)}
        ${deductionRow('Section 80TTB', parsed.deductions.sec80TTB)}
        ${lineRow('Total Deductions under Chapter VI-A', parsed.deductions.total, { indent: true })}

        <tr class="row-bold total-row"><td>Total Income (Taxable)</td><td class="amount">${formatCurrency(parsed.income.totalIncome)}</td></tr>
      </table>

      <table class="comp-table">
        <tr class="section-head"><th colspan="2">Computation of Tax Payable</th></tr>
        ${lineRow('Tax on Total Income (as per slab)', computed.slabTax)}
        ${lineRow('Less: Rebate u/s 87A', computed.rebate)}
        ${lineRow('Tax after Rebate', computed.taxAfterRebate, { bold: true })}
        ${lineRow('Add: Health & Education Cess @ 4%', computed.cess)}
        ${lineRow('Gross Tax Liability', computed.grossTaxLiability, { bold: true })}
        ${lineRow('Less: Relief u/s 89', computed.relief89)}
        <tr class="row-bold total-row"><td>Net Tax Liability</td><td class="amount">${formatCurrency(computed.netTaxLiability)}</td></tr>
      </table>

      <table class="comp-table">
        <tr class="section-head"><th colspan="2">Taxes Paid</th></tr>
        ${lineRow('TDS', parsed.taxPaid.tds, { indent: true })}
        ${lineRow('TCS', parsed.taxPaid.tcs, { indent: true })}
        ${lineRow('Advance Tax', parsed.taxPaid.advanceTax, { indent: true })}
        ${lineRow('Self-Assessment Tax', parsed.taxPaid.selfAssessmentTax, { indent: true })}
        ${lineRow('Total Taxes Paid', computed.totalTaxesPaid, { bold: true })}

        <tr class="row-bold total-row">
          ${computed.refundDue > 0
            ? `<td>Refund Due</td><td class="amount">${formatCurrency(computed.refundDue)}</td>`
            : `<td>Balance Tax Payable</td><td class="amount">${formatCurrency(computed.balancePayable)}</td>`
          }
        </tr>
      </table>

      <p class="disclaimer">
        This is an unofficial computation sheet generated for reference purposes only.
        It is not a substitute for the official filed return or professional tax advice.
      </p>
    </div>

    <div class="no-print" style="margin-top:24px; text-align:center;">
      <button onclick="window.print()">Print / Save as PDF</button>
      <button onclick="downloadAsWord()">Download as Word (.doc)</button>
      <button onclick="location.reload()">Upload Another File</button>
    </div>
  `;
}

// Builds a standalone .doc file (HTML wrapped for MS Word) from the
// computation sheet, with the action buttons stripped out.
function downloadAsWord() {
  const sheet = document.getElementById('printArea');
  if (!sheet) return;

  const clone = sheet.cloneNode(true);
  clone.removeAttribute('oncopy');
  clone.removeAttribute('oncontextmenu');
  clone.removeAttribute('onselectstart');

  const styles = `
    body { font-family: 'Times New Roman', serif; font-size: 12pt; color:#000; }
    .sheet-title { text-align:center; margin-bottom:16px; }
    .sheet-title h2 { margin:0 0 4px; font-size:15pt; }
    .sub-title { font-size:10pt; }
    table { border-collapse: collapse; width:100%; margin-bottom:14px; }
    .info-table td { padding:3px 6px; font-size:11pt; }
    .info-label { font-weight:bold; white-space:nowrap; }
    .comp-table { border:1px solid #000; }
    .comp-table td, .comp-table th { border:1px solid #000; padding:5px 8px; font-size:11pt; }
    .comp-table .section-head th { background:#eaeaea; text-align:center; font-size:12pt; }
    .comp-table .amount { text-align:right; width:160px; }
    .comp-table .indent { padding-left:24px; }
    .row-bold td { font-weight:bold; }
    .total-row td { border-top:2px solid #000; }
    .disclaimer { font-size:9pt; color:#555; margin-top:14px; }
  `;

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>Computation Sheet</title><style>${styles}</style></head>
    <body>${clone.outerHTML}</body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ITR-Computation-Sheet.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
