import Swal from "sweetalert2";
import XLSX from "xlsx-js-style";

/**
 * Helper to check if a string represents a pure numeric value that should be right-aligned.
 * Excludes long ID codes (NIP, NUPTK, NISN, phone numbers) which should remain left-aligned as text.
 */
function isNumericValue(str: string): boolean {
  const clean = str.trim();
  if (clean === "-" || clean === "") return false;
  // Exclude values with leading zeros (e.g. phone numbers, codes)
  if (clean.startsWith("0") && clean.length > 2) return false;
  // Exclude long identifiers (NIP, NISN, NUPTK usually > 10 chars)
  if (clean.length > 10 && /^\d+$/.test(clean)) return false;
  return /^-?\d+(\.\d+)?$/.test(clean);
}

/**
 * Exports data to a professionally styled Excel file (.xlsx).
 * Uses xlsx-js-style to format title blocks, headers, borders, zebra striping, and auto column widths.
 * 
 * @param filename File name (e.g., "daftar_antrian.xlsx")
 * @param sheetName Sheet tab name (e.g., "Antrian")
 * @param title Report title inside the sheet
 * @param headers Array of header labels
 * @param rows 2D array of row data
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  title: string,
  headers: string[],
  rows: any[][]
) {
  try {
    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];

    // 1. Report Title (Row 0)
    wsData.push([
      {
        v: title.toUpperCase(),
        t: "s",
        s: {
          font: { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "1E3A8A" } },
          alignment: { vertical: "center", horizontal: "left" }
        }
      }
    ]);

    // 2. Report Subtitle (Row 1)
    wsData.push([
      {
        v: `Dicetak pada: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`,
        t: "s",
        s: {
          font: { name: "Segoe UI", sz: 9, italic: true, color: { rgb: "4B5563" } },
          alignment: { vertical: "center", horizontal: "left" }
        }
      }
    ]);

    // 3. Spacer (Row 2)
    wsData.push([]);

    // 4. Headers (Row 3)
    const headerRow = headers.map(h => ({
      v: h,
      t: "s",
      s: {
        font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F46E5" } }, // Brand Indigo
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "CBD5E1" } },
          bottom: { style: "thin", color: { rgb: "94A3B8" } },
          left: { style: "thin", color: { rgb: "CBD5E1" } },
          right: { style: "thin", color: { rgb: "CBD5E1" } }
        }
      }
    }));
    wsData.push(headerRow);

    // 5. Data Rows (Row 4 onwards)
    rows.forEach((row, rowIndex) => {
      const isEven = rowIndex % 2 === 1;
      const bgRgb = isEven ? "F8FAFC" : "FFFFFF"; // Slate-50 zebra color or White

      const dataRow = row.map(val => {
        let cleanVal = val === null || val === undefined ? "-" : String(val).trim();

        // Strip ="value" formatting used for old CSV leading-zero preservation
        if (cleanVal.startsWith('="') && cleanVal.endsWith('"')) {
          cleanVal = cleanVal.substring(2, cleanVal.length - 1);
        }

        const isNum = isNumericValue(cleanVal);
        return {
          v: cleanVal,
          t: "s", // force text format to keep leading zeros intact
          s: {
            font: { name: "Segoe UI", sz: 10, color: { rgb: "1F2937" } },
            fill: { fgColor: { rgb: bgRgb } },
            alignment: {
              vertical: "center",
              horizontal: isNum ? "right" : "left",
              wrapText: cleanVal.length > 25
            },
            border: {
              top: { style: "thin", color: { rgb: "E2E8F0" } },
              bottom: { style: "thin", color: { rgb: "E2E8F0" } },
              left: { style: "thin", color: { rgb: "E2E8F0" } },
              right: { style: "thin", color: { rgb: "E2E8F0" } }
            }
          }
        };
      });
      wsData.push(dataRow);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge title and subtitle cells across all table columns
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(headers.length - 1, 0) } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(headers.length - 1, 0) } }
    ];

    // Row heights
    ws["!rows"] = [
      { hpt: 26 }, // Title
      { hpt: 18 }, // Subtitle
      { hpt: 10 }, // Spacer
      { hpt: 28 }, // Header
      ...rows.map(() => ({ hpt: 20 })) // Data rows
    ];

    // Calculate column widths dynamically based on cell content length
    const colWidths = headers.map((h, colIdx) => {
      let maxLen = h.length;
      rows.forEach(row => {
        let val = row[colIdx];
        if (val !== null && val !== undefined) {
          let strVal = String(val).trim();
          if (strVal.startsWith('="') && strVal.endsWith('"')) {
            strVal = strVal.substring(2, strVal.length - 1);
          }
          maxLen = Math.max(maxLen, strVal.length);
        }
      });
      // Set reasonable min (10) and max (55) widths
      return { wch: Math.min(Math.max(maxLen + 4, 10), 55) };
    });
    ws["!cols"] = colWidths;

    // Enable gridlines display explicitly
    ws["!views"] = [{ showGridLines: true }];

    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // sheetName limit is 31 chars
    XLSX.writeFile(wb, filename);

    Swal.fire({
      title: "Berhasil!",
      text: "File Excel berhasil diunduh.",
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Gagal melakukan export data ke Excel:", error);
    Swal.fire({
      title: "Error",
      text: "Gagal mengekspor data.",
      icon: "error",
      confirmButtonColor: "#ef4444",
    });
  }
}

/**
 * compatibility wrapper to map old exportToCSV calls to styled exportToExcel.
 * Automatically modifies the extension to .xlsx and titles the report nicely.
 */
export function exportToCSV(filename: string, headers: string[], rows: any[][]) {
  const baseName = filename.replace(/\.csv$/i, "");
  const newFilename = `${baseName}.xlsx`;
  const sheetName = baseName.substring(0, 31);
  const title = baseName.replace(/_/g, " ");

  exportToExcel(newFilename, sheetName, title, headers, rows);
}
