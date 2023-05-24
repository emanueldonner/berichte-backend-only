export { ListParagraph as default };

import lodash from 'lodash';
import xmlFormatter from 'xml-formatter';

import { findStyle, findElementAtLevel, getListInfo, getLog } from '../lib/lib.js';


class ListParagraph {

    constructor(docx, parts) {

        this.log = getLog();
        this.abstractNum = getListInfo(docx, parts[0].xml_js) 
        let r = [];
        this.indent(parts.map( x => x), 0, r);
        // console.log('=============================================');
        // console.dir(r, {depth: 500});
        this.parts = r;
        // TODO; Hack ahead ..
        this.xml_js = {}; 
    }

    toHtml(context = {}) {
        let f = this.abstractNum.numFmt();
        let op;
        let cl;
        if (f === 'bullet') {
            op = '<ul>';
            cl = '</ul>';
        } else {
            op = '<ol>';
            cl = '</ol>';
        }
        return xmlFormatter(this.toHtml1(context, this.parts, op, cl));
    }

    toNunjucks(context = {}) {
        return {
            text: this.toHtml(context),
        };
    }

    toHtml1(context, list, op, cl) {

        let t = op;
        let i = 0;

        while (i < list.length) {
            t += '<li>';
            if (Array.isArray(list[i])) {
                t += this.toHtml1(context, list[i], op, cl);
            } else {
                t += list[i].toHtmlParagraph(context);
            }
            if ( i + 1 < list.length && Array.isArray(list[i + 1] ) ) {
                t += this.toHtml1(context, list[i + 1], op, cl);
                i++;
            }
            t += '</li>';
            i++;
        }

        return t + cl;
    }

    indent(parts, level, out) {

        while (parts.length > 0) {

            let ilvl = parts[0].listLevel();
            
            if (ilvl < level) {
                return;
            }
            
            if (level === ilvl) {
                out.push(parts.shift());
            } else {
                let out1 = [];
                this.indent(parts, level + 1, out1);
                // while (out1.length === 1 && Array.isArray(out1[0])) {
                //    out1 = out1[0];
                // }
                out.push(out1);
            }
        }
    }
}

