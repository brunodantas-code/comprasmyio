import JSZip from "jszip";
import type { RegistrationExportRow } from "./site-survey-registration-export";

// Layout follows the client-approved workbook: Nunito, title with client name, totals on top,
// frozen header with filters and native Excel in-cell checkboxes for Água/Energia.
const FEATURE_BAGS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><FeaturePropertyBags xmlns="http://schemas.microsoft.com/office/spreadsheetml/2022/featurepropertybag"><bag type="Checkbox"/><bag type="XFControls"><bagId k="CellControl">0</bagId></bag><bag type="XFComplement"><bagId k="XFControls">1</bagId></bag><bag type="XFComplements" extRef="XFComplementsMapperExtRef"><a k="MappedFeaturePropertyBags"><bagId>2</bagId></a></bag></FeaturePropertyBags>';
const CHECKBOX_EXT = '<extLst><ext uri="{C7286773-470A-42A8-94C5-96B5CB345126}" xmlns:xfpb="http://schemas.microsoft.com/office/spreadsheetml/2022/featurepropertybag"><xfpb:xfComplement i="0"/></ext></extLst>';
const HAIR = '<color rgb="FFBFBFBF"/>';
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="6"><font><sz val="11"/><name val="Nunito"/></font><font><sz val="24"/><name val="Nunito"/></font><font><sz val="18"/><name val="Nunito"/></font><font><b/><sz val="11"/><name val="Nunito"/></font><font><b/><sz val="12"/><name val="Nunito"/></font><font><sz val="12"/><name val="Nunito"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top style="hair">${HAIR}</top><bottom style="hair">${HAIR}</bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10">`
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' // 0 default
  + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' // 1 title
  + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' // 2 subtitle
  + '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' // 3 total label
  + '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 4 total value
  + '<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' // 5 header left
  + '<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 6 header center
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>' // 7 body left
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 8 body center
  + `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/>${CHECKBOX_EXT}</xf>` // 9 checkbox
  + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const col = (index: number) => String.fromCharCode(66 + index); // data starts at column B

export async function buildRegistrationExcel(rows: RegistrationExportRow[], clientName = "") {
  const withMeter = rows.some((row) => row.meter && row.meter !== "—");
  const columns: Array<{ title: string; width: number; align: "left" | "center"; value: (row: RegistrationExportRow) => string | boolean }> = [
    { title: "LUC", width: 13, align: "center", value: (row) => row.luc },
    ...(withMeter ? [{ title: "Nº do medidor", width: 16, align: "center" as const, value: (row: RegistrationExportRow) => row.meter }] : []),
    { title: "Tipo", width: 19, align: "center", value: (row) => row.type },
    { title: "Nome", width: 34, align: "left", value: (row) => row.name },
    { title: "Localização", width: 18, align: "center", value: (row) => row.location },
    { title: "Água", width: 11, align: "center", value: (row) => row.water },
    { title: "Energia", width: 13, align: "center", value: (row) => row.energy },
  ];
  const first = 7;
  const last = Math.max(first, first + rows.length - 1);
  const lastCol = col(columns.length - 1);
  const waterCol = col(columns.length - 2);
  const energyCol = lastCol;
  const labelCol = col(columns.length - 3);
  const strCell = (ref: string, text: string, style: number) => `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
  const countCell = (c: string) => `<c r="${c}5" s="4"><f>COUNTIF(${c}${first}:${c}${last},TRUE)</f><v>${rows.filter((row) => (c === waterCol ? row.water : row.energy)).length}</v></c>`;
  const sheetRows = [
    `<row r="2" ht="33" customHeight="1">${strCell("B2", clientName.trim() || "Cliente", 1)}</row>`,
    `<row r="3" ht="25" customHeight="1">${strCell("B3", "Cadastro de lojas, quiosques e ambientes", 2)}</row>`,
    `<row r="5" ht="25" customHeight="1">${strCell(`${labelCol}5`, "Total selecionado", 3)}${countCell(waterCol)}${countCell(energyCol)}</row>`,
    `<row r="6" ht="22" customHeight="1">${columns.map((column, index) => strCell(`${col(index)}6`, column.title, column.align === "center" ? 6 : 5)).join("")}</row>`,
    ...rows.map((row, rowIndex) => {
      const r = first + rowIndex;
      return `<row r="${r}" ht="22" customHeight="1">${columns.map((column, index) => {
        const value = column.value(row);
        const ref = `${col(index)}${r}`;
        return typeof value === "boolean" ? `<c r="${ref}" t="b" s="9"><v>${value ? 1 : 0}</v></c>` : strCell(ref, value, column.align === "center" ? 8 : 7);
      }).join("")}</row>`;
    }),
  ];
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="B2:${lastCol}${last}"/><sheetViews><sheetView showGridLines="0" tabSelected="1" zoomScale="110" zoomScaleNormal="110" workbookViewId="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="B7" sqref="B7"/></sheetView></sheetViews><sheetFormatPr baseColWidth="10" defaultRowHeight="17"/><cols><col min="1" max="1" width="2.66" customWidth="1"/>${columns.map((column, index) => `<col min="${index + 2}" max="${index + 2}" width="${column.width}" customWidth="1"/>`).join("")}</cols><sheetData>${sheetRows.join("")}</sheetData><autoFilter ref="B6:${lastCol}${last}"/><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/></worksheet>`;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/featurePropertyBag/featurePropertyBag.xml" ContentType="application/vnd.ms-excel.featurepropertybag+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Lojas e ambientes" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Lojas e ambientes'!$B$6:$${lastCol}$${last}</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdClientCheckboxes" Type="http://schemas.microsoft.com/office/2022/11/relationships/FeaturePropertyBag" Target="featurePropertyBag/featurePropertyBag.xml"/></Relationships>');
  zip.file("xl/styles.xml", STYLES);
  zip.file("xl/worksheets/sheet1.xml", sheet);
  zip.file("xl/featurePropertyBag/featurePropertyBag.xml", FEATURE_BAGS);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
