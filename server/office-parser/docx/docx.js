export { Docx as default };

import fs from 'fs';
import path from 'path';

import AdmZip from 'adm-zip';
import xmlFormatter from 'xml-formatter';
import { xml2js } from 'xml-js';
import sizeOf from 'image-size';

import { mkdirhir, findElementAtLevel, detectMimeTypeFromBuffer, findAllElements, getLog } from '../lib/lib.js';


class Docx {

    constructor(inputFile) {
        
        try {
            this.log = getLog();
            this.zip = new AdmZip(inputFile);
            this.parseNumbering();
            this.parseDocumentRels();
            this.parseFootnotes();
            this.parseFootnoteRels();
            this.picProperties = false;
            this.constructorError = false;
            
        } catch (e) {
            this.log.error({loc: '18de7c', err: e});
            this.constructorError = true;
        }
    }
    
    async outputXml(dir) {

        let names = this.zip.getEntries().map(z => dir + path.sep + z.entryName);

        mkdirhir(names, true);

        for (let z of this.zip.getEntries()) {
            if (z.isDirectory) {
                continue;
            }
            let buf = z.getData();
            let type = await detectMimeTypeFromBuffer(buf);

            if (type?.mime === 'application/xml') {
                let xml = xmlFormatter(buf.toString('utf8'));
                fs.writeFileSync(dir + path.sep + z.entryName, xml);
            } else {
                fs.writeFileSync(dir + path.sep + z.entryName, buf);
            }
        }
    }

    async outputPics(dir) {

        let dims = ! this.picProperties;

        if (dims) {
            this.picProperties = {};
        }
        
        for (let p of Object.values(this.documentRelMapping)) {
            if (p.base) {
                let z = this.zip.getEntry(p.target);
                if (! z) {
                    this.log.warn({loc: '074be3', ref: '355f2a1a-e8b2-43be-a7e2-9cd85fed6154', base: p.base, target: p.target}, 'Non file based inline picture');
                    continue;
                }
                let fn = dir + path.sep + p.base;
                fs.writeFileSync(fn, z.getData());
                let type = await detectMimeTypeFromBuffer(z.getData());

                switch (type?.mime) {
                case 'image/png':
                case 'image/jpg':
                    break;
                default:
                    this.log.warn({loc: '074be3', ref: '14742aac-24b6-4335-be96-b49b1b8bcc72', type}, 'Unsupported picture format');
                    continue;
                    break;
                }

                if (dims) {
                    let d = sizeOf(fn);
                    this.picProperties[p.base] = d;
                }
            }
        }
    }
    
    parseNumbering() {

        let xml_js = xml2js(this.zip.readAsText('word/numbering.xml'));
        let abs = {};
        let num = {};

        if (xml_js.elements?.[0].elements) {
        
            for (let e of xml_js.elements[0].elements) {
                if (e.name === 'w:abstractNum') {
                    let a = new AbstractNum(e);
                    abs[a.abstractNumId] = a;
                }
            }

            for (let e of xml_js.elements[0].elements) {
                if (e.name === 'w:num') {
                    let numId = e.attributes['w:numId'];
                    let abstractNumId = e.elements[0].attributes['w:val'];
                    num[numId] = abs[abstractNumId];
                }
            }
            
        }
        this.numMapping = num;
    }

    getAbstractNum(id) {
        return this.numMapping[id];
    }

    parseDocumentRels() {
        this.documentRelMapping = this.findRelsFromFile('word/_rels/document.xml.rels');
    }
    
    parseFootnotes() {

        let xml_js = xml2js(this.zip.readAsText('word/footnotes.xml'));
        let map = {};

        for (let e of findAllElements(xml_js, 'w:footnote')) {
            let id = e.attributes['w:id'];
            map[id] = e.elements;
        }
        this.footnoteMapping = map;
    }

    parseFootnoteRels() {
        this.footnoteRelMapping = this.findRelsFromFile('word/_rels/footnotes.xml.rels');
    }

    getFootnoteElements(id) {
        return this.footnoteMapping[id];
    }
    
    getDocumentRel(id) {
        return this.documentRelMapping[id];
    }

    getFootnoteRel(id) {
        return this.footnoteRelMapping[id];
    }
    
    getTextElements() {

        let xml_js = xml2js(this.zip.readAsText('word/document.xml'));
        // console.dir(xml_js, {depth: 40});
        let els = xml_js.elements[0].elements[0].elements.filter( e => e.name === 'w:p' || e.name === 'w:tbl' );

        let fn = e => {
            if (! e.attributes) {
                e.attributes = {};
            }
        };
        els.forEach( e => fn );

        return els;
    }

    getPicProperties(name) {
        // TODO: This only works after outputPics has been called at least once
        return this.picProperties[name];
    }

    findRelsFromFile(fn) {
        
        let xml_js = xml2js(this.zip.readAsText(fn));
        let map = {};

        for (let e of findAllElements(xml_js, 'Relationship')) {
            let r = new Relationship(e, 'word' + path.sep);
            map[r.id] = r;
        }
 
        return map;
    }
}

class AbstractNum {

    constructor(xml_js) {

        this.abstractNumId = xml_js.attributes['w:abstractNumId'];
        this.level0 = xml_js.elements.find( e => e.name === 'w:lvl' && e.attributes['w:ilvl'] === '0' );
    }

    numFmt() {

        let e = this.level0.elements.find( e => e.name === 'w:numFmt' );
        return e.attributes['w:val'];
    }
}

class Relationship {

    constructor(xml_js, rp) {
        if (xml_js.attributes) {
            this.id = xml_js.attributes.Id;
            this.type = xml_js.attributes.Type;
            let re = /.*relationships\/image/;
            if (this.type.match(re)) {
                this.target = rp + xml_js.attributes.Target;
                let pi = path.parse(this.target);
                this.base = pi.base;
            } else {
                this.target = xml_js.attributes.Target;
            }
        }
    }
}

