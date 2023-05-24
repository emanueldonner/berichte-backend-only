export { PictureParagraph as default };

import { findElement, findAllElements, findElementAtLevel, getLog } from '../lib/lib.js';


class PictureParagraph {

    constructor(docx, xml_js, context = {}) {

        this.log = getLog();
        this.docx = docx;
        this.xml_js = xml_js;

        this.drawings = true;
        
        this.elements = findAllElements(xml_js, 'w:drawing', {minLeveL: 2});

    }

    toHtml(context = {}) {
        return this.pictureLinks();
    }

    toHtmlParagraph(context) {
        // Only defined here because of pictures in a list. Probably incorrect.
        return this.toHtml(context);
    }
    
    pictureLinks() {

        let files = this.pictureFiles();
        let links = '';

        for (let f of files) {
            links += f ? `<img src="/images/${f}">` : '<p><strong>No picture file found!!</strong></p>';
        }

        return links;
    }
    
    pictureFiles() {

        return this.elements.map( d => this.pictureFile(d) );
    }
    
    pictureFile(drawing) {
        let blip = findElement(drawing, ['pic:pic', 'pic:blipFill', 'a:blip']);
        if (! blip) {
            return null;
        }
        let rel = blip.attributes['r:embed'];
        let dr = this.docx.getDocumentRel(rel);

        return dr.base;
    }

    pictureDescription(drawing) {

        let cnvpr = findElement(drawing, ['pic:pic', 'pic:nvPicPr', 'pic:cNvPr']);
        let descr = cnvpr?.attributes?.descr;
        
        return descr ? descr : '';
    }

    toChapterPicture() {

        let d = this.elements[0];
        let image = `/images/${this.pictureFile(d)}`;
        let image_alt = this.pictureDescription(d);

        return {image, image_alt};
    }

    toNunjucks(context = {}) {

        let { frontMatter, defs, imgPlaceholder } = context;
        
        let res = {
            text: '',
        };

        for (let d of this.elements) {
            let ph = imgPlaceholder();
            let fn = this.pictureFile(d);
            let p = this.docx.getPicProperties(fn);

            let pi = {
                src: `/images/${fn}`,
                link: `/images/${fn}`,
                alt: this.pictureDescription(d),
                attributes: {
                    width: p?.width,
                    // height: p.height,
                }
            };
            frontMatter[ph] = pi;
            res.text += `{{ image(${ph}) }}`;
        }
        defs.push('{% from "components/image/image.njk" import image with context %}');

        return res;
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
}
