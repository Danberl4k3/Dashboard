import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync } from 'fflate';
import { readXlsx } from '../lib/data-sources/xlsx-reader.ts';

function buildXlsxBuffer() {
  const files = {
    'xl/workbook.xml': Uint8Array.from(
      Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Datos" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
      ),
    ),
    'xl/_rels/workbook.xml.rels': Uint8Array.from(
      Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
                Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
                Target="worksheets/sheet1.xml"/>
</Relationships>`,
      ),
    ),
    'xl/worksheets/sheet1.xml': Uint8Array.from(
      Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Agencia</t></is></c>
      <c r="B1"><v>42</v></c>
    </row>
  </sheetData>
</worksheet>`,
      ),
    ),
  };

  const bytes = zipSync(files);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

test('readXlsx parses minimal workbook', () => {
  const buffer = buildXlsxBuffer();
  const workbook = readXlsx(buffer);

  const sheet = workbook.sheet('Datos');
  assert.ok(sheet, "sheet 'Datos' should exist");
  assert.equal(sheet.maxRow, 1);
  assert.equal(sheet.get(1, 1), 'Agencia');
  assert.equal(sheet.get(1, 2), 42);

  assert.equal(workbook.sheet('Missing'), null);
});
