export { Parser as default };

import Paragraph from '../paragraph/paragraph.js';
import PictureParagraph from '../picture-paragraph/picture-paragraph.js';
import ListParagraph from '../list-paragraph/list-paragraph.js';
import Table from '../table/table.js';
import Chart from '../chart/chart.js';
import ExcelTable from '../excel-table/excel-table.js';

import { isParagraph, isListParagraph, isPictureParagraph, isTable, isChart, isViennaVizChart, isExcelReference, getLog, } from '../lib/lib.js';



class Parser {


    constructor(docx) {

        this.log = getLog();
        this.docx = docx;
    }

    async parse(args) {
        let { textTrace } = args;
        let els = this.docx.getTextElements();
        let result = [];

        for (let e of els) {
            // Check, if e is a well formed xml_js element
            let e1 = false;
            let empty = false;
            
            if (isParagraph(e)) {
                e1 = new Paragraph(this.docx, e, {textTrace});
                empty = e1.isEmpty();
            }

            if (isPictureParagraph(e)) {
                e1 = new PictureParagraph(this.docx, e, {textTrace});
            }

            if (isTable(e)) {
                e1 = new Table(this.docx, e);
            }

            if (isExcelReference(e)) {
                e1 = await ExcelTable.build(this.docx, e, {textTrace});
            }

            if (e1) {
                if (! empty) { 
                    result.push(e1);
                }
            } else {
                this.log.warn({loc: '47e448', ref: '721bb6b3-bcc9-4aeb-a0ba-d382c3d7eab6', xml_js: e}, 'Unknown element');
            }
        }
        this.parseResult = result;

        this.extractChapterPictures();
        this.checkHeaders();
        this.extractListParagraphs();
        this.extractCharts();
    }

    extractChapterPictures() {

        let { parseResult } = this;
        let result = [];

        for (let i = 0; i !== parseResult.length; i++) {
            let r = parseResult[i];
            if (r.drawings && i > 0 && parseResult[i - 1].headerLevel === 1) {
                parseResult[i - 1].chapterPicture = r.toChapterPicture();
            } else {
                result.push(r);
            }
        }

        this.parseResult = result;
    }
    
    checkHeaders() {

        let { parseResult } = this;
        let result = [];
        let headers = [];
        
        for (let i = 0; i !== parseResult.length; i++) {
            let r = parseResult[i];
            result.push(r);
            if (r.headerLevel) {
                headers.push(r);
            }
            if ( r.headerLevel === 1 && parseResult?.[i + 1]?.headerLevel !== 2) {
                this.log.warn({loc: '7b1a07', ref: '7bb6ba5e-0d26-45da-99f7-b8f2335eced0', context: r.toText()}, 'Inserting "fake" H2 paragraph');
                result.push(new Paragraph(this.docx, undefined, {fakeH2: true}));
            }
        }

        if (! headers.find( h => h.headerLevel === 1)) {
            this.log.error({loc: 'd8951e', ref: '9124ddf6-85fb-49ab-b65e-eb97d8219c2b'}, 'No H1 header found in document');
        }

        for (let i = 1; i != headers.length; i++) {
            let d = headers[i].headerLevel - headers[i - 1].headerLevel;
            if (d > 1) {
                this.log.warn({loc: '635aec', ref: 'bf098725-99c4-484d-aba7-8c1fb6acf744'}, 'Invalid level change between "%s" and "%s"', headers[i - 1].toText(), headers[i].toText());
            }
        }

        for (let h of headers) {
            let t1 = h.toText();
            let t2 = h.toHtml({noWrap: true});
            if (t1 !== t2) {
                this.log.warn({loc: '702162', ref: 'ded645d1-ce99-4e2a-8833-de414864e97a', html: t2}, 'Header "%s" contains html markup', t2);
            }
        }
        this.parseResult = result;
    }
        
    extractListParagraphs() {

        let { parseResult } = this;
        let result = [];
        let collecting = false;
        let collection;
        
        for (let e of parseResult) {

            if (! isListParagraph(this.docx, e.xml_js) && collecting) {
                result.push(new ListParagraph(this.docx, collection));
                collecting = false;
            }
            
            if (isListParagraph(this.docx, e.xml_js) && ! collecting) {
                collection = [];
                collecting = true;
            }

            if (collecting) {
                collection.push(e);
            } else {
                result.push(e);
            }
        }

        if (collecting) {
            result.push(new ListParagraph(this.docx, collection));
        }

        this.parseResult = result;
    }

    extractCharts() {
        
        let { parseResult } = this;
        let result = [];

        while (parseResult.length > 0) {
            let r = parseResult.shift();

            let chart = false;
            let viennaviz = false;
            let chl = [];
            
            if (isChart(r.xml_js)) {
                chart = true;
            }
            if (isViennaVizChart(r.xml_js)) {
                chart = true;
                viennaviz = true;
            }

            if (chart) {
                chl.push(r);
                
                for (let i = 0; i != 3; i++) {
                    chl.push(parseResult.shift());
                    r = new Chart(this.docx, chl, {viennaviz});
                }
            }

            result.push(r);
        }

        this.parseResult = result;
    }

            
    getParseResult() {
        return this.parseResult;
    }
}

    







