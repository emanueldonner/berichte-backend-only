export { Nunjucks as default };

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import lodash from 'lodash';

import { mkdirhir, getLog, textTraceOut } from '../lib/lib.js';

class Nunjucks {


    constructor(elements) {
        this.log = getLog();
        this.elements = elements;
        this.chaptersJson = [];
    }


    output(args) {

        let { toplevel, textTrace } = args;
        
        if (textTrace) {
            textTraceOut('\n=============================== nunjucks ===============================\n');
        }
        
        let chapters = [];

        let c = false;
        for (let e of this.elements) {
            if (e.headerLevel === 1) {
                if (c) {
                    chapters.push(c);
                }
                c = [];
            }
            if (c) {
                c.push(e);
            }
        }

        chapters.push(c);

        let count = 0;
        for (let ch of chapters) {

            this.outputChapter(toplevel, ch, count, textTrace);
            count++;
        }
    }

    outputChapter(toplevel, elements, count, textTrace) {
        let c = count.toString().padStart(3, '0');
        let ch = `chapter_${c}`;
        let d = `${toplevel}${path.sep}${ch}`;
        let header = elements.shift();        
        let pages = [];
        let cl = {
            bg: 'nebelgrau',
            color: 'fastschwarz',
        };
        let cj = {
            title: header.toText(),
            folder: ch,
        };

        if (header.chapterPicture) {
            lodash.merge(cj, header.chapterPicture);
        } else {
            lodash.merge(cj, cl);
        }
        
        this.chaptersJson.push(cj);

        mkdirhir(d);

        let p = false;
        for (let e of elements) {
            if (e.headerLevel === 2) {
                if (p) {
                    pages.push(p);
                }
                p = [];
            }
            p.push(e);
        }

        pages.push(p);
        let count1 = 1;
        for (let pg of pages) {
            this.outputPage(d, pg, count1, textTrace);
            count1++;
        }
    }

    outputPage(toplevel, elements, count, textTrace) {
        let ic = 0;
        let tc = 0;
        let imgPlaceholder = () => {
            ic++;
            return 'image' + ic;
        };
        let tabPlaceholder = () => {
            tc++;
            return 'tab_items' + tc;
        };
        let header = elements.shift();
        let htext = sanitizeFilename(header.toText());
        let frontMatter = {
            title: header.toText(),
            permalink: '/{{ page | parentSlug }}/{{ title | strToSlug }}/index.html',
            hide_nav: true,
        };
        // We leave this in for the time being, not used any more in new footnote handling
        let footnotes = {
            current: 1,
            list: [],
        }
                
        let c = count.toString().padStart(3, '0');

        let fn = `${toplevel}${path.sep}${c}_${htext}.njk`;
        let defs = [];
        let output = '';

        for (let e of elements) {
            let r = e.toNunjucks({frontMatter, defs, imgPlaceholder, tabPlaceholder, footnotes, textTrace});
            output += r.text + '\n';
        }
        if (defs.length > 0) {
            defs.push('');
        }
        let fms = '---\n' + YAML.stringify(frontMatter) + '---\n';
        let trailer = this.processFootnotes(footnotes);
        fs.writeFileSync(fn, fms + lodash.uniq(defs).join('\n') + output + trailer);    
    }

    processFootnotes(footnotes) {
        if (footnotes.list.length === 0) {
            return '';
        }

        let fn = `<div class="js-wm-footnotes rich-text" id="footnote">
  <h4>Fußnoten</h4>
  <span hidden id="footnote-back">Zurück zu Referenz</span>
  <ol>`;

        for (let f of footnotes.list) {
            fn += '<li>' + f + '</li>';            
        }

        return fn + '</ol></div>';
    }
    
    outputJson(toplevel) {
        let fn = `${toplevel}${path.sep}chapters.json`;
        fs.writeFileSync(fn, JSON.stringify(this.chaptersJson, null, 4));
    }
}

function sanitizeFilename(fn) {

    // This might not be enough for NTFS, see https://stackoverflow.com/questions/1976007/what-characters-are-forbidden-in-windows-and-linux-directory-names

    fn = fn.replaceAll('<', '_');
    fn = fn.replaceAll('>', '_');
    fn = fn.replaceAll('"', '_');
    fn = fn.replaceAll('?', '_');
    fn = fn.replaceAll('*', '_');  
    fn = fn.replaceAll('/', '_'); 
    fn = fn.replaceAll(':', '_'); 
    fn = fn.replaceAll('\'', '_'); 
    fn = fn.replaceAll('|', '_'); 

    return fn;
}
