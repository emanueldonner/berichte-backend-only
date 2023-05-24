export { Table as default };

import xmlFormatter from 'xml-formatter';

import { findElementAtLevel, findElementAtPath, getLog } from '../lib/lib.js';
import Paragraph from '../paragraph/paragraph.js';

class Table {

    constructor(docx, xml_js, context = {}) {
        this.log = getLog();
        this.docx = docx;
        this.xml_js = xml_js;

        this.line1 = true;
        this.column1 = false;
        let p = [ e => e.name === 'w:tbl', e => e.name === 'w:tblPr', e => e.name === 'w:tblStyle' && e.attributes && e.attributes['w:val'] === 'wien-zeile1-betont' ];
        if (findElementAtPath(xml_js, p) !== null) {
            this.class = 'wien-zeile1-betont';
        }
        p = [ e => e.name === 'w:tbl', e => e.name === 'w:tblPr', e => e.name === 'w:tblStyle' && e.attributes && e.attributes['w:val'] === 'wien-spalte1-betont' ];
        if (findElementAtPath(xml_js, p) !== null) {
            this.column1 = true;
            this.line1 = false;
            this.class = 'wien-spalte1-betont';
        }
            
        this.rows = findRows(xml_js);
    }
    
    toHtml(context = {}) {

        if (this.line1) {
            this.rows[0].properties.headerStart = true;
            this.rows[0].properties.headerEnd = true;
        }

        let insideHeader = false;
        let thead = '';
        let tbody = '';
        
        for (let r of this.rows) {
            if (r.properties.headerStart) {
                insideHeader = true;
            }
            let rHtml = '';
            let firstColumn = this.column1;
            for (let c of r.cells) {
                let ct = cellText(this.docx, c);
                let classes = findCellClasses(c);
                rHtml += wrapCell(ct, {insideHeader, firstColumn, classes});
                firstColumn = false;
            }
            if (insideHeader) {
                thead += wrapRow(rHtml);
            } else {
                tbody += wrapRow(rHtml);
            }
            if (r.properties.headerEnd) {
                insideHeader = false;
            }
        }

        if (thead) {
            thead = '<thead>' + thead + '</thead>';
        }

        if (tbody) {
            tbody = '<tbody>' + tbody + '</tbody>';
        }
        let tag = this.class ? `<table class="${this.class}">` : '<table>';
        return xmlFormatter(tag + thead + tbody + '</table>');
    }

    toNunjucks({} = {}) {
        return {
            text: this.toHtml(),
        };
    }
}


function findRows(xml_js) {
    
    let rows = [];

    for (let e1 of xml_js.elements) {                
        if (e1.name === 'w:tr') {
            let row = {
                properties: {},
                cells: [],
            };                
            for (let e2 of e1.elements) {
                if (e2.name === 'w:tc') {
                    row.cells.push(e2);
                }
            }
            rows.push(row);
        }
    }

    return rows;
}

function wrapRow(r, args = {}) {

    return '<tr>' + r + '</tr>';
}

function wrapCell(c, args = {}) {

    let html;
    let scope = false;
    let classes = '';

    if (args.firstColumn) {
        scope = 'row';
    }

    if (args.insideHeader) {
        scope = 'col';
    }

    if (args.classes.length > 0) {
        classes = ' class="' + args.classes.join(' ') + '"';
    }
    
    if (scope) {
        html = `<th scope="${scope}"${classes}>${c}</th>`; 
    } else {
        html = `<td${classes}>${c}</td>`; 
    }

    return html;
}

function cellText(docx, xml_js) {

    let pred = [ e => e.name === 'w:tc', e => e.name === 'w:p' ];
    let para_xml_js = findElementAtPath(xml_js, pred);
    let para = new Paragraph(docx, para_xml_js);
    return para.toHtmlParagraph({noWrap: true});
}

function findCellClasses(c) {

    let classes = [];
    
    let p = e => e.name === 'w:shd';
    let e = findElementAtLevel(c, p, 2, 2);

    if (e && e.attributes && e.attributes['w:fill']) {
        classes.push('LKT-' + e.attributes['w:fill']);
    }

    return classes;
}
