// Renders the ITR-1 computation sheet in the "Statement of Income"
// format (Winman-style): bordered A.Y. box, plain personal-info block,
// bulleted income heads, and single/double underlines for subtotals
// and final totals instead of a grid of table borders.

function formatCurrency(num) {
  const n = Number(num) || 0;
  const neg = n < 0;
  const s = Math.abs(Math.round(n)).toLocaleString('en-IN');
  return neg ? '(' + s + ')' : s;
}

function formatAadhaar(num) {
  const clean = (num || '').toString().replace(/\D/g, '');
  if (clean.length !== 12) return num || '';
  return clean.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
}

function formatDMY(raw) {
  if (!raw) return '';
  const s = raw.toString();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${m[3]}-${months[parseInt(m[2],10)-1]}-${m[1]}`;
}

// ---- Row builders for the Statement of Income table ----

// Bulleted head-of-income row, e.g. "Income from Salary". No amount unless isFinal.
function headRow(label, opts) {
  opts = opts || {};
  const amountCell = opts.amount !== undefined
    ? `<td class="amt final ${opts.underline || ''}">${formatCurrency(opts.amount)}</td>`
    : `<td class="amt"></td>`;
  return `<tr class="head-row">
    <td class="desc"><span class="bullet">■</span><span class="head-text">${label}</span></td>
    <td class="amt"></td>
    ${amountCell}
  </tr>`;
}

// Bold subheading with no bullet and no amount, e.g. "Less: Deductions under Chapter VI-A"
function subheadRow(label) {
  return `<tr><td class="desc subhead" colspan="3">${label}</td></tr>`;
}

// Plain / indented line item. col = 'mid' or 'final'. underline = '' | 'u-single' | 'u-double'
function itemRow(label, amount, col, opts) {
  opts = opts || {};
  if (opts.skipZero && (!amount || amount === 0)) return '';
  const cls = [opts.italic ? 'italic' : '', opts.bold ? 'bold' : ''].join(' ').trim();
  const indentCls = opts.indent2 ? 'indent2' : 'indent1';
  const mid = col === 'mid' ? `amt mid ${opts.underline || ''}` : 'amt mid';
  const fin = col === 'final' ? `amt final ${opts.underline || ''}` : 'amt final';
  return `<tr>
    <td class="desc ${indentCls} ${cls}">${label}</td>
    <td class="${mid}">${col === 'mid' ? formatCurrency(amount) : ''}</td>
    <td class="${fin}">${col === 'final' ? formatCurrency(amount) : ''}</td>
  </tr>`;
}

// Bold bulleted total row (Total Income / Refund / Balance Payable), double underline
function grandRow(label, amount) {
  return `<tr class="head-row">
    <td class="desc"><span class="bullet">■</span><span class="head-text bold">${label}</span></td>
    <td class="amt"></td>
    <td class="amt final u-double bold">${formatCurrency(amount)}</td>
  </tr>`;
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

  const fullName = (parsed.personal.firstName + ' ' + parsed.personal.surName).trim().toUpperCase();
  const ayLabel = `${parsed.filing.assessmentYear}-${(parseInt(parsed.filing.assessmentYear) + 1)}`;
  const pyStart = parseInt(parsed.filing.assessmentYear) - 1;
  const pyLabel = `${pyStart}-${parseInt(parsed.filing.assessmentYear)}`;
  const address = [parsed.personal.city, parsed.personal.pin].filter(Boolean).join(' - ');

  const hasHP = parsed.income.incomeFromHouseProperty && parsed.income.incomeFromHouseProperty !== 0;
  const hasOS = parsed.income.incomeFromOtherSources && parsed.income.incomeFromOtherSources !== 0;
  const hasRelief = computed.relief89 && computed.relief89 !== 0;

  container.innerHTML = `
    <div class="comp-sheet" id="printArea" oncopy="return false" oncontextmenu="return false" onselectstart="return false">

      <div class="ay-box-wrap"><div class="ay-box">A.Y.&nbsp;&nbsp;&nbsp;${ayLabel}</div></div>

      <table class="info-grid">
        <tr>
          <td class="lbl">Name</td><td class="colon">:</td><td class="val">${fullName}</td>
          <td class="lbl">Previous Year</td><td class="colon">:</td><td class="val">${pyLabel}</td>
        </tr>
        <tr>
          <td class="lbl">Address</td><td class="colon">:</td><td class="val">${address || '-'}</td>
          <td class="lbl">PAN</td><td class="colon">:</td><td class="val">${parsed.personal.pan}</td>
        </tr>
        <tr>
          <td class="lbl"></td><td></td><td class="val"></td>
          <td class="lbl">Aadhaar No.</td><td class="colon">:</td><td class="val">${formatAadhaar(parsed.personal.aadhaar)}</td>
        </tr>
        <tr>
          <td class="lbl"></td><td></td><td class="val"></td>
          <td class="lbl">Date of Birth</td><td class="colon">:</td><td class="val">${formatDMY(parsed.personal.dob)}</td>
        </tr>
        <tr>
          <td class="lbl"></td><td></td><td class="val"></td>
          <td class="lbl">Status</td><td class="colon">:</td><td class="val">Individual</td>
        </tr>
        <tr>
          <td class="lbl"></td><td></td><td class="val"></td>
          <td class="lbl"></td><td></td><td class="val">Resident</td>
        </tr>
        ${!parsed.filing.oldRegime ? `
        <tr>
          <td class="lbl"></td><td></td><td class="val"></td>
          <td class="lbl"></td><td></td><td class="val">Tax u/s 115BAC</td>
        </tr>` : ''}
      </table>

      <div class="statement-banner">Statement of Income</div>
      <table class="col-headers"><tr><td></td><td class="amt mid">Rs.</td><td class="amt final">Rs.</td></tr></table>

      <table class="income-table">
        ${headRow('Income from Salary')}
        ${itemRow('Gross Salary', parsed.income.grossSalary, 'mid')}
        ${itemRow('Less: Allowances Exempt u/s 10', parsed.income.allowancesExempt, 'mid', { skipZero: true })}
        ${itemRow('Net Salary', parsed.income.netSalary, 'mid', { underline: 'u-single' })}
        ${itemRow('Less: Standard Deduction u/s 16(ia)', parsed.income.stdDeduction16ia, 'mid', { skipZero: true })}
        ${itemRow('Less: Professional Tax u/s 16(iii)', parsed.income.professionalTax16iii, 'mid', { skipZero: true })}
        ${itemRow('Income chargeable under the head "Salaries"', parsed.income.incomeFromSalary, 'final', { italic: true })}

        ${hasHP ? headRow('Income from House Property', { amount: parsed.income.incomeFromHouseProperty }) : ''}
        ${hasOS ? headRow('Income from Other Sources', { amount: parsed.income.incomeFromOtherSources }) : ''}

        ${itemRow('Gross Total Income', parsed.income.grossTotalIncome, 'final', { bold: true, underline: 'u-single' })}

        ${parsed.deductions.total > 0 ? subheadRow('Less: Deductions under Chapter VI-A') : ''}
        ${itemRow('Section 80C', parsed.deductions.sec80C, 'mid', { skipZero: true, indent2: true })}
        ${itemRow('Section 80CCD(1B)', parsed.deductions.sec80CCD1B, 'mid', { skipZero: true, indent2: true })}
        ${itemRow('Section 80D', parsed.deductions.sec80D, 'mid', { skipZero: true, indent2: true })}
        ${itemRow('Section 80E', parsed.deductions.sec80E, 'mid', { skipZero: true, indent2: true })}
        ${itemRow('Section 80G', parsed.deductions.sec80G, 'mid', { skipZero: true, indent2: true })}
        ${itemRow('Section 80TTA', parsed.deductions.sec80TTA, 'mid', { skipZero: true, indent2: true })}
        ${itemRow('Section 80TTB', parsed.deductions.sec80TTB, 'mid', { skipZero: true, indent2: true })}
        ${parsed.deductions.total > 0 ? itemRow('Total Deductions', parsed.deductions.total, 'mid', { underline: 'u-single', indent2: true }) : ''}

        ${grandRow('Total Income', parsed.income.totalIncome)}

        ${itemRow('Tax on Total Income', computed.slabTax, 'final')}
        ${itemRow('Less: Rebate u/s 87A', computed.rebate, 'final', { skipZero: true })}
        ${itemRow('Tax after Rebate', computed.taxAfterRebate, 'final', { underline: 'u-single' })}
        ${itemRow('Add: Health &amp; Education Cess @ 4%', computed.cess, 'final')}
        ${itemRow('Gross Tax Liability', computed.grossTaxLiability, 'final', { underline: 'u-single' })}
        ${hasRelief ? itemRow('Less: Relief u/s 89', computed.relief89, 'final') : ''}
        ${itemRow('Net Tax Liability', computed.netTaxLiability, 'final', { underline: 'u-single' })}

        ${computed.totalTaxesPaid > 0 ? subheadRow('Less: Taxes Paid') : ''}
        ${itemRow('TDS', parsed.taxPaid.tds, 'mid', { skipZero: true, indent2: true })}
        ${itemRow('TCS', parsed.taxPaid.tcs, 'mid', { skipZero: true, indent2: true })}
        ${itemRow('Advance Tax', parsed.taxPaid.advanceTax, 'mid', { skipZero: true, indent2: true })}
        ${itemRow('Self-Assessment Tax', parsed.taxPaid.selfAssessmentTax, 'mid', { skipZero: true, indent2: true })}
        ${computed.totalTaxesPaid > 0 ? itemRow('Total Taxes Paid', computed.totalTaxesPaid, 'mid', { underline: 'u-single', indent2: true }) : ''}

        ${computed.refundDue > 0
          ? grandRow('Refund Due', computed.refundDue)
          : grandRow('Balance Tax Payable', computed.balancePayable)
        }
      </table>

      <div class="sign-block">
        <div class="sign-left">
          <div>Date&nbsp;:</div>
          <div>Place :</div>
        </div>
        <div class="sign-right">(${fullName})</div>
      </div>
    </div>

    <div class="no-print" style="margin-top:24px; text-align:center;">
      <button onclick="window.print()">Print / Save as PDF</button>
      <button onclick="downloadAsWord()">Download as Word (.doc)</button>
      <button onclick="location.reload()">Upload Another File</button>
    </div>
  `;
}

// Builds a standalone .doc file (HTML wrapped for MS Word) from the
// computation sheet, matching the same Statement-of-Income styling.
function downloadAsWord() {
  const sheet = document.getElementById('printArea');
  if (!sheet) return;

  const clone = sheet.cloneNode(true);
  clone.removeAttribute('oncopy');
  clone.removeAttribute('oncontextmenu');
  clone.removeAttribute('onselectstart');

  const styles = `
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color:#000; }
    .ay-box-wrap { text-align:center; margin-bottom:14px; }
    .ay-box { display:inline-block; border:1px solid #000; padding:4px 14px; font-weight:bold; }
    .info-grid { width:100%; border-collapse:collapse; margin-bottom:12px; font-size:10pt; }
    .info-grid td { padding:2px 4px; }
    .lbl { font-weight:bold; white-space:nowrap; width:110px; }
    .colon { width:10px; }
    .statement-banner { border:1.4px solid #000; text-align:center; font-weight:bold; padding:5px; margin-bottom:2px; font-size:11pt; }
    .col-headers, .income-table { width:100%; border-collapse:collapse; font-size:10pt; }
    .col-headers td { font-size:9pt; font-style:italic; padding:2px 4px; }
    .income-table td { padding:3px 4px; vertical-align:top; }
    .desc.indent1 { padding-left:18px; }
    .desc.indent2 { padding-left:34px; }
    .desc.subhead { font-weight:bold; padding-top:8px; }
    .bullet { margin-right:6px; }
    .head-text { font-weight:bold; text-decoration:underline; }
    .italic { font-style:italic; }
    .bold { font-weight:bold; }
    .amt { text-align:right; width:110px; }
    .u-single { border-bottom:1px solid #000; }
    .u-double { border-bottom:3px double #000; }
    .sign-block { display:flex; justify-content:space-between; margin-top:40px; font-size:10pt; }
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
