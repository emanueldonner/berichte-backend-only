
export { ExcelTable as default };

import ExcelJS from 'exceljs';
import printf  from 'printf';
import xmlFormatter from 'xml-formatter';

import { findAllElements, getLog } from '../lib/lib.js';


class ExcelTable {

    constructor(docx, xml_js) {

        this.log = getLog();
        this.docx = docx;
        this.xml_js = xml_js;
    
        // console.dir(xml_js, {depth: 4});
        
        let ta = findAllElements(xml_js, 'w:t', {minLevel: 1});
        let ref = '';
        
        for (let t of ta) {
            if (t.elements) {
                let t1 = t.elements.filter( e => e.type === 'text' ).map( e => e.text ).join('');
                ref += t1;
            }
        }

        let m = ref.match(/\[(.*)\](.*)/);

        if (m) {
            this.filename = m[1];
            if (m[2] !== '') {
                let [left, right] = m[2].split('!');
                this.worksheet = left;
                if (right) {
                    this.range = right;
                } else {
                    this.range = false;
                }
            } else {
                this.worksheet = false;
            }
        } else {        
            this.filename = ref;
        }
    }

    static async build(docx, xml_js) {
        let et = new ExcelTable(docx, xml_js);
        let workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(et.filename);
        et.workbook = workbook;
        return et;
    }

    toHtml(context = {}) {


        let worksheet;

        if (this.worksheet) {
            worksheet = this.workbook.getWorksheet(this.worksheet);
        } else {
            let worksheets = [];        
        
            this.workbook.eachSheet(function(worksheet, sheetId) {
                worksheets.push(worksheet);
            });

            worksheet = worksheets[0];
        }

        let rec;
        if (this.range) {
            rec = this.findRangeRectangle(worksheet, this.range);
            console.dir(rec);
            
        } else {
            rec = this.findMaxRectangle(worksheet);
        }

        let {minRow, minCol, maxRow, maxCol} = rec;
        
        
        let first = true;
        let thead = '';
        let tbody = '';
        
        for (let i = minRow; i <= maxRow; i++) {
            if (first) {
                thead += '<tr>';
            } else {
                tbody += '<tr>';
            }
            for (let j = minCol; j <= maxCol; j++) {
                let cell = worksheet.getCell(i, j);
                let v = this.cell2String(cell);

                if (first) {
                    thead += `<th>${v}</th>`;
                } else {
                    tbody += `<td>${v}</td>`;
                }                                                   
            }
            if (first) {
                thead += '</tr>';
            } else {
                tbody += '</tr>';
            }
            first = false;
        }

        return xmlFormatter(`<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`);
    }

    findMaxRectangle(worksheet) {
        let minRow = Number.MAX_SAFE_INTEGER;
        let minCol = Number.MAX_SAFE_INTEGER;
        let maxRow = 0;
        let maxCol = 0;

        worksheet.eachRow(function(row, rowNumber) {
            minRow = minRow > rowNumber ? rowNumber : minRow;
            maxRow = maxRow < rowNumber ? rowNumber : minRow;
            // console.dir(rowNumber);
            row.eachCell(function(cell, colNumber) {
                minCol = minCol > colNumber ? colNumber : minCol;
                maxCol = maxCol < colNumber ? colNumber : maxCol;

                // console.log(rowNumber + '/' + colNumber + ' = ');
                // console.dir(cell.value, {depth: 10});
        
            });
        });

        return {minRow, minCol, maxRow, maxCol};
    }

    findRangeRectangle(worksheet, range) {

        // console.dir(range);
        
        let [lu, rl] = range.split(':');

        let luc = worksheet.getCell(lu);
        let rlc = worksheet.getCell(rl);

        // console.dir(luc, {depth: 2});
        
        return {
            minRow: luc._row._number,
            minCol: luc._column._number,
            maxRow: rlc._row._number,
            maxCol: rlc._column._number,
        };
    }
    
    cell2String(cell) {
        let v;

        switch (cell.type) {

        case ExcelJS.ValueType.Null:
            v = this.formatNullCell(cell);
            break;
        case ExcelJS.ValueType.Number:
            v = this.formatNumberCell(cell);
            break;
        case ExcelJS.ValueType.String:
            v = this.formatStringCell(cell);
            break;
        case ExcelJS.ValueType.Date:
            v = this.formatDateCell(cell);
            break;
        case ExcelJS.ValueType.Formula:
            v = this.formatFormulaCell(cell);
            break;
        default:
            v = '[[ unhandled type]]';
            break;            

        }

        // v += ` [[${cell.numFmt}]]`;
        return v;
    }

    formatNullCell(cell) {
        return '';
    }

    formatNumberCell(cell) {
        return this.formatNumber(cell.value, cell.numFmt);
    }
    
    formatStringCell(cell) {
        return cell.value;
    }

    formatDateCell(cell) {
        return this.formatDate(cell.value, cell.numFmt);
    }

    formatFormulaCell(cell) {
        if (cell.effectiveType === ExcelJS.ValueType.Number) {
            return this.formatNumber(cell.result, cell.numFmt);
        } else {
            return cell.result;
        }
    }

    formatNumber(value, numFmt) {

        if (! numFmt) {
            numFmt = '';
        }
        
        let f1 = numFmt.split(';')[0];
        let f2;
        let flist;
        let th = false;
        let pct = false;
        let precision = 0;
        let svalue;
        let fmt;
        

        f2 = f1.replaceAll(',', '');

        if (f1 !== f2) {
            th = true;
            f1 = f2;
        }
        
        f2 = f1.replaceAll('%', '');

        if (f1 !== f2) {
            pct = true;
            f1 = f2;
            value *= 100;
        }

        flist = f1.split('.');


        if (flist.length > 1) {
            precision = flist[1].length;
        } else {
            flist.push('');
        }

        if (! (flist[0].match(/^#*0$/) && flist[1].match(/^0*$/))) {
            // return String(value).replace('.', ',') + ` [[${numFmt}]]`;
            return String(value).replace('.', ',');
        }       

        svalue = printf(`%.${precision}f`, value).split('.');

        if (th) {
            let l1 = svalue[0].split('').reverse();
            let l2 = [];
            let i = 0;
            
            for (let d of l1) {
                if (i % 3 === 0 && i > 0) {
                    l2.unshift('.');
                }
                l2.unshift(d);
                i++;
            }

            svalue[0] = l2.join('');
        }

        let ret = svalue.length === 1 ? svalue[0] : svalue[0] + ',' + svalue[1];

        ret = pct ? ret + '%' : ret;
        
        return ret;
    }
    
    formatDate(value, numFmt) {
        return `${value} [[${numFmt}]]`;
    }
    
    toNunjucks(context = {}) {
        return {text: this.toHtml(context)};
    }

}   
