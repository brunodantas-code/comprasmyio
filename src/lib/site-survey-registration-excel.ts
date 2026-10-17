import * as XLSX from "xlsx";
import JSZip from "jszip";
import type { RegistrationExportRow } from "./site-survey-registration-export";

// Native Excel in-cell controls, using the same OOXML feature bags as XlsxWriter.
const FEATURE_BAGS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><FeaturePropertyBags xmlns="http://schemas.microsoft.com/office/spreadsheetml/2022/featurepropertybag"><bag type="Checkbox"/><bag type="XFControls"><bagId k="CellControl">0</bagId></bag><bag type="XFComplement"><bagId k="XFControls">1</bagId></bag><bag type="XFComplements" extRef="XFComplementsMapperExtRef"><a k="MappedFeaturePropertyBags"><bagId>2</bagId></a></bag></FeaturePropertyBags>';
const CHECKBOX_XF = '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/><extLst><ext uri="{C7286773-470A-42A8-94C5-96B5CB345126}" xmlns:xfpb="http://schemas.microsoft.com/office/spreadsheetml/2022/featurepropertybag"><xfpb:xfComplement i="0"/></ext></extLst></xf>';

export async function buildRegistrationExcel(rows: RegistrationExportRow[]) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["LUC", "Nº do medidor", "Tipo", "Nome", "Localização", "Água", "Energia"],
    ...rows.map((row) => [row.luc, row.meter, row.type, row.name, row.location, row.water, row.energy]),
  ]);
  sheet["!cols"] = [18, 22, 18, 42, 36, 12, 12].map((wch) => ({ wch }));
  sheet["!autofilter"] = { ref: `A1:G${rows.length + 1}` };
  sheet["!rows"] = Array.from({ length: rows.length + 1 }, () => ({ hpt: 22 }));
  if (rows.length) {
    const totalRow = rows.length + 3;
    sheet[`E${totalRow}`] = { t: "s", v: "Total selecionado" };
    for (const [column, key] of [["F", "water"], ["G", "energy"]] as const) {
      sheet[`${column}${totalRow}`] = { t: "n", f: `COUNTIF(${column}2:${column}${rows.length + 1},TRUE)`, v: rows.filter((row) => row[key]).length };
    }
    sheet["!ref"] = `A1:G${totalRow}`;
  }
  XLSX.utils.book_append_sheet(workbook, sheet, "Lojas e ambientes");
  const zip = await JSZip.loadAsync(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));
  const stylesFile = zip.file("xl/styles.xml");
  const sheetFile = zip.file("xl/worksheets/sheet1.xml");
  const relsFile = zip.file("xl/_rels/workbook.xml.rels");
  const typesFile = zip.file("[Content_Types].xml");
  if (!stylesFile || !sheetFile || !relsFile || !typesFile) throw new Error("Não foi possível preparar as caixas editáveis do Excel.");
  const [styles, xml, rels, types] = await Promise.all([stylesFile.async("string"), sheetFile.async("string"), relsFile.async("string"), typesFile.async("string")]);
  const count = Number(styles.match(/<cellXfs count="(\d+)"/)?.[1]);
  if (!Number.isInteger(count) || count < 1) throw new Error("Formato de estilos do Excel inválido.");
  zip.file("xl/styles.xml", styles.replace(/<cellXfs count="\d+"/, `<cellXfs count="${count + 1}"`).replace("</cellXfs>", `${CHECKBOX_XF}</cellXfs>`).replace(/<name val="Calibri"\/>/g, '<name val="Arial"/>'));
  zip.file("xl/worksheets/sheet1.xml", xml.replace(/<c\b([^>]*\br="[FG]\d+"[^>]*)>/g, (cell, attrs: string) => {
    if (!/\bt="b"/.test(attrs)) return cell;
    return `<c${attrs.replace(/\s+s="\d+"/, "")} s="${count}">`;
  }));
  zip.file("xl/featurePropertyBag/featurePropertyBag.xml", FEATURE_BAGS);
  zip.file("xl/_rels/workbook.xml.rels", rels.replace("</Relationships>", '<Relationship Id="rIdClientCheckboxes" Type="http://schemas.microsoft.com/office/2022/11/relationships/FeaturePropertyBag" Target="featurePropertyBag/featurePropertyBag.xml"/></Relationships>'));
  zip.file("[Content_Types].xml", types.replace("</Types>", '<Override PartName="/xl/featurePropertyBag/featurePropertyBag.xml" ContentType="application/vnd.ms-excel.featurepropertybag+xml"/></Types>'));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}