
import { findStyle, findElement, findAllElements, findElementAtLevel, getLog, textTraceOut } from '../lib/lib.js';
import { isParagraph, isParagraphProperty, isRun, isHyperlink, isText, isFootnote, isSuperscriptRun, isSubscriptRun, isBreak} from '../lib/lib.js';

export { Paragraph as default };

let tstack = '';

class Paragraph {

    constructor(docx, xml_js, context = {}) {

        let { fakeH2 } = context;
        
        this.log = getLog();
        this.insideFootnote = context.insideFootnote;
        
        if (fakeH2) {
            this.fakeH2(docx);
            return;
        }
        
        this.docx = docx;
        this.xml_js = xml_js;
        this.elements = [];
        
        this.style = findStyle(xml_js);
        this.headerLevel = this.findHeaderLevel();
        this.drawings = false;
        if (xml_js.elements) {
            for (let e of xml_js.elements) {

                this.log.trace({loc: 'c84a8a', xml_js: e}, 'checking paragraph element');

                let e1 = false;
                let ignore = false;

                if (isRun(e)) {
                    e1 = new Run(docx, e, context);
                }
                if (isHyperlink(e)) {
                    e1 = new Hyperlink(docx, e, context);
                }
                if (isParagraphProperty(e)) {
                    ignore = true;
                }
                if (e1) {
                    this.elements.push(e1);                        
                } else if (! ignore) {
                    this.log.warn({loc: '6d31ba', ref: '721bb6b3-bcc9-4aeb-a0ba-d382c3d7eab6', element: e.name}, 'Unknown paragraph level element %s, ignoring', e.name);
                }
            }
        }
        let t = this.toText();
        tstack += t;
        if (tstack.length > 80) {
            tstack = tstack.substring(tstack.length - 80);
        }

        if (this.isEmpty()) {
            this.log.info({loc: '41bf84', ref: '165c18d0-7fee-4353-a6b1-4cacaa7575c7', context: tstack, style: this.style, headerLevel: this.headerLevel}, 'Empty paragraph found');
        } else {
            let t1 = t.length < 40 ? t.substring(0, 40) : t.substring(0, 40) + '...';  
            this.log.debug({loc: '6fc8c8', text: t1, style: this.style, headerLevel: this.headerLevel}, 'new paragraph ready');
        }
    }
    

    isEmpty() {

        if (this.drawings) {
            return false;
        }
        
        let t = this.toText();

        // Everything whitespace but newlines, for <br /> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Character_Classes        
        return t.match(/^[ \f\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*$/);
    }

    fakeH2(docx) {
        let e1 = {
                    type: 'element',
                    name: 'w:pPr',
                    elements: [
                        {
                            type: 'element',
                            name: 'w:pStyle',
                            attributes: { 'w:val': 'berschrift2' }
                        }
                    ]
        };
        let e2 = {
                    type: 'element',
                    name: 'w:r',
                    attributes: {
                    },
                    elements: [
                        {
                            type: 'element',
                            name: 'w:t',
                            elements: [ { type: 'text', text: 'Einleitungxxxx==' } ]
                        }
                    ]
        };

        let xml_js = {
            type: 'element',
            name: 'w:p',
            attributes: {
            },
            elements: [e1, e2],
        };

        this.docx = docx;
        this.xml_js = xml_js;
        this.elements = [new Run(docx, e2)];
        
        this.style = findStyle(xml_js);
        this.headerLevel = this.findHeaderLevel();        
    }
    
    toHtml(context = {}) {

        if (this.drawings) {
            return this.pictureLinks();
        } else { 
            return this.toHtmlParagraph(context);
        }
    }

    toHtmlParagraph(context = {}) {

        let { insideFootnote, noWrap } = context;
        
        let html = this.elements.map( e => e.toHtml(context) ).join('');
        
        if (this.insideFootnote || noWrap) {
            return html;
        }

        if (html) {

            switch (this.style) {
            case 'berschrift1':               
                html = `<h1>${html}</h1>`;
                break;
            case 'berschrift2':
                html = `<h2>${html}</h2>`;
                break;
            case 'berschrift3':
                html = `<h3>${html}</h3>`;
                break;
            case 'berschrift4':
                html = `<h4>${html}</h4>`;
                break;
            case 'berschrift5':
                html = `<h5>${html}</h5>`;
                break;
            case 'berschrift6':
                html = `<h6>${html}</h6>`;
                break;
            case 'Beschriftung':
                html = `<figcaption>${html}</figcaption>`;
                break;
            case 'Zitat':
                html = `<blockquote>${html}</blockquote>`;
                break;
            default:
                if (this.style) {
                    html = `<p class="${this.style}">${html}</p>`;
                } else {
                    html = `<p>${html}</p>`;
                }
            }            
        }
        
        return html;
    }

    toText(context = {}) {        
        return this.elements.map( e => e.toText(context) ).join('');
    }
    
    toNunjucks(context = {}) {
        // console.dir(context, {depth: 10});
        let { frontMatter } = context;
        
        let res = {
            text: '',
        };

        let text = '';
        this.elements.forEach( e => {
            let r = e.toNunjucks(context);
            text += r.text;
        });
        let id;
        switch (this.style) {
        case 'berschrift3':
            id = this.idValueFromText(text);
            res.text = `<h2 id="${id}">${text}</h2>`;
            frontMatter.hide_nav = false;
            break;
        case 'berschrift4':
            res.text = `<h3>${text}</h3>`;
            break;
        case 'berschrift5':
            res.text = `<h4>${text}</h4>`;
            break;
        case 'berschrift6':
            res.text = `<h5>${text}</h5>`;
            break;
        case 'berschrift7':
            res.text = `<h6>${text}</h6>`;
            break;
        case 'Beschriftung':
            res.text = `<figcaption>${text}</figcaption>`;
            break;
        default:
            if (this.style) {
                res.text = `<p class="${this.style}">${text}</p>`;
            } else {
                if (text) {
                    res.text = `<p>${text}</p>`;
                } else {
                    res.text = '';
                }
            }
        }

        return res;
    }

    findHeaderLevel() {

        let level = 0;
        
        switch (this.style) {
        case 'berschrift1':
            level = 1;
            break;
        case 'berschrift2':
            level = 2;
            break;
        case 'berschrift3':
            level = 3;
            break;
        case 'berschrift4':
            level = 4;
            break;
        case 'berschrift5':
            level = 5;
            break;
        case 'berschrift6':
            level = 6;
            break;
        }

        return level;
    }

    listLevel() {

        let level = -1;
        let p = e => e.name === 'w:ilvl';
        let e = findElementAtLevel(this.xml_js, p, 3, 3);
        if (e) {
            level = Number(e.attributes['w:val']);
        }

        return level;
    }

    idValueFromText(text) {

        let id = '';

        for (let i = 0; i != text.length; i++) {
            let c = '-';
            let n = text.charCodeAt(i);

            if ((48 <= n && n <= 57) ||
                (65 <= n && n <= 90) ||
                (57 <= n && n <= 122) ||
                n == 45 || n == 95) {

                c = text.charAt(i);
            }

            id += c;
        }

        return id;
    }
}

class Run {

    constructor(docx, xml_js, context = {}) {

        let s = findElement(xml_js, ['w:rPr', 'w:rStyle']);
        this.elements = [];
        this.xml_js = xml_js;
        this.insideFootnote = context.insideFootnote;

        if (! xml_js.elements) {
            return;
        }

        if (s?.attributes && s.attributes['w:val']) {
            this.style = s.attributes['w:val'];
        }

        // Only office bold
        s = findElement(xml_js, ['w:rPr', 'w:b']);
        if (s?.type === 'element') {
            this.style = 'Starkbetont';
        }
        
        for (let e of xml_js.elements) {
            let e1 = false;
            if (isText(e)) {
                e1 = new Text(docx, e, context);
            }
            if (isFootnote(e)) {
                e1 = new Footnote(docx, e, context);
            }
            if (isBreak(e)) {
                e1 = new Break(docx, e, context);
            }
            if (e1) { 
                this.elements.push(e1);
            }
        }
    }

    toNunjucks(context = {}) {
        let c = this.elements.map( e => e.toNunjucks(context).text ).join(' ');
        return { text: this.htmlify(c) };
    }

    toHtml(context = {}) {
        let c = this.elements.map( e => e.toHtml(context) ).join(' ');
        return this.htmlify(c);
    }

    htmlify(text) {
        let html = '';

        if (text) {
            switch (this.style) {
            case 'IntensiveHervorhebung':
            case 'Starkbetont':
                html = `<strong>${text}</strong>`;
                break;
            case 'Hervorhebung':
            case 'Betont':
                html = `<em>${text}</em>`;
                break;
            case 'Fett':
                html = `<b>${text}</b>`;
                break;
            default:
                html = text;
            }
        }

        if (isSuperscriptRun(this.xml_js)) {
            html = '<sup>' + html + '</sup>';
        }

        if (isSubscriptRun(this.xml_js)) {
            html = '<sub>' + html + '</sub>';
        }
        
        return html;
    }
    
    toText(context = {}) {
        return this.elements.map( e => e.toText(context) ).join('');
    }   
}

class Text {

    constructor(docx, xml_js, context = {}) {
        let { textTrace } = context;
        this.xml_js = xml_js;
        this.log = getLog();
        this.insideFootnote = context.insideFootnote;
        if (textTrace) {
            this.textTrace();
        }
    }

    toNunjucks(context = {}) {

        if (context.textTrace) {
            this.textTrace();
        }

        return {
            text: this.toHtml(context),
        };
    }
    
    toHtml(context = {}) {

        if ( ! this.xml_js.elements ) {
            // No empty text ...
            return ' ';
        }
        return this.xml_js.elements.filter( e => e.type === 'text' ).map( e => e.text ).join(' ');
    }

    toText() {
        return this.toHtml();
    }

    textTrace() {
        textTraceOut(this.toText() + '\n');
    }
}

class Hyperlink {

    constructor(docx, xml_js, context = {}) {
        let { textTrace } = context;
        this.docx = docx;
        this.xml_js = xml_js;
        this.insideFootnote = context.insideFootnote;
        if (textTrace) {
            this.textTrace();
        }
    }

    toNunjucks(context = {}) {
        
        if (context.textTrace) {
            this.textTrace();
        }
        
        return {
            text: this.toHtml(context),
        };
    }

    extract(insideFootnote = false) {
        let { docx, xml_js } = this;
        let text = '';
        
        let target = 'http://localhost';
        
        if (xml_js.attributes && xml_js.attributes['r:id']) {
            let rel;
            if (this.insideFootnote) {
                rel = docx.getFootnoteRel(xml_js.attributes['r:id']);
            } else{
                rel = docx.getDocumentRel(xml_js.attributes['r:id']);
            }
            if (rel) {                
                target = rel.target;
            }
        }
        
        for (let r of findAllElements(xml_js, ['w:r'])) {
            let run = new Run(docx, r);
            text += run.toText();
        }
        
        if (text === '') {
            text = target;
        }
        
        return { target, text };
    }

    toHtml(context = {}) {

        let t = this.extract(context.insideFootnote);

        return `<a href="${t.target}">${t.text}</a>`;
    }

    toText() {

        let t = this.extract();

        return `|${t.text}|${t.target}|`;
    }

    textTrace() {
        textTraceOut(this.toText());
    }
}

class Footnote {

    constructor(docx, xml_js, context = {}) {

        this.log = getLog();
        this.docx = docx;
        this.xml_js = xml_js;
        this.elements = [];

        context.insideFootnote = true;
        if (context.textTrace) {
            textTraceOut('[[[');
        }
        let id = this.xml_js.attributes['w:id'];
        for (let e of this.docx.getFootnoteElements(id)) {
            let e1 = false;
            let empty = false;
            
            if (isParagraph(e)) {
                e1 = new Paragraph(this.docx, e, context);
                empty = e1.isEmpty();
            }

            if (e1) {
                if (! empty) { 
                    this.elements.push(e1);
                }
            } else {
                this.log.warn({loc: '208b36', ref: 'a259964b-e503-4360-bed6-31b22398b596', xml_js: e}, 'Unknown element inside footnote');
            }
        }
        if (context.textTrace) {
            textTraceOut(']]]');
        }
        context.insideFootnote = false;
    }

    toNunjucks(context = {}) {
        
        let html = this.elements.map( e => e.toNunjucks(context).text ).join('');
        return { text: `<span class='wm-parse-footnote' title='${html}'></span>` };
    }
    
    toHtml(context = {}) {
        
        let html = this.elements.map( e => e.toHtml(context) ).join('');        
        return `<span class='wm-parse-footnote' title='${html}'></span>`;
    }

    toText(context = {}) {
        return this.elements.map( e => e.toText(context) ).join('');;
    }
}

class Break {

    constructor(docx, xml_js, context = {}) {
        this.docx = docx;
        this.xml_js = xml_js;
        this.insideFootnote = context.insideFootnote;
    }

    toNunjucks(context = {}) {
        return { text: '<br />' };
    }
    
    toHtml(context = {}) {
        return '<br />';
    }

    toText() {
        return '\n';
    }
}
