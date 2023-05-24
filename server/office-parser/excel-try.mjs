#!/usr/bin/env node
'use strict';

import ExcelJS from 'exceljs';
import printf  from 'printf';

async function doit() {

    let workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('samples/Patay Kennzahlen_Leistungen 2020_spitalsamb.xlsx');
    let out = process.stdout;
    
    let worksheets = [];
    
    workbook.eachSheet(function(worksheet, sheetId) {
        worksheets.push(worksheet);
    });

    let worksheet = worksheets[1];

    console.log(ExcelJS.ValueType.Formula);
    console.log('-----');

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
            if (rowNumber === 68888 && colNumber === 3) {
                console.dir(cell, {depth: 10});
            }                
        });
    });

    printf(out, "%s\n", 'aaaa');
    
    console.dir({minRow, minCol, maxRow, maxCol}); 

    for (let i = minRow; i <= maxRow; i++) {
        for (let j = minCol; j <= maxCol; j++) {
            let cell = worksheet.getCell(i, j);
            let v;
            if (cell.type == ExcelJS.ValueType.Formula) {
                v = cell.result;
            } else {
                v = cell.value;
            }
            if (cell.type == ExcelJS.ValueType.Null) {
                // v = ' XXXXXXXXXX ';
            }
            printf(out, "%s | ", v);
        }
        printf(out, "\n");
    }

    console.dir(worksheet.getCell('B6'));
    console.dir(worksheet.getCell('$B6'));
                

}


doit().then( console.log('OK') );
