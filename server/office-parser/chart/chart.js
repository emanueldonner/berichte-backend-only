export { Chart as default };

import { findElement, getLog } from '../lib/lib.js';

class Chart {

    constructor(docx, parts, {viennaviz = false} = {}) {

        this.log = getLog();
        this.docx = docx;
        this.parts = parts;
        this.viennaviz = viennaviz;
    }

    toHtml(context = {}) {

        return '=====================';
    }

    toNunjucks(context = {}) {

        let { frontMatter, defs, imgPlaceholder, tabPlaceholder } = context;
        let r;
        let ph = tabPlaceholder();

        defs.push('{% from "components/tabs/tabs.njk" import tabs, tabContent with context %}');
        
        let res = {
            text: `{% call tabs(items = ${ph}, id = '${ph}')%}\n{% call tabContent(id = ${ph}[0].title) %}\n`,
        };        
        
        if (this.viennaviz) {
            let p = ['w:drawing', 'wp:inline', 'wp:docPr', 'a:hlinkClick'];
            let el = findElement(this.parts[0].xml_js, p);
            let rel = this.docx.getDocumentRel(el.attributes['r:id']);
            let target = rel.target;

            res.text += `<div id="missing" class="viennaviz-container" style="overflow: hidden; padding-top: 80%; position: relative;"><iframe src="${rel.target}" name="ViennaViz Visualisierung" style="border: 0; height: 100%; left:0; position: absolute; top: 0; width: 100%;">
<p>Keine Unterstützung für iframes in Ihrem Browser</p>
</iframe></div>\n`;                            
        } else {            
            r = this.parts[0].toNunjucks(context);
            res.text += r.text + '\n';            
        }

        res.text += '<figcaption class="image-caption">\n';
        res.text += this.parts[1].toText() + '\n';
        res.text += '</figcaption>\n{% endcall%}\n';
        res.text += `{% call tabContent(id = ${ph}[1].title) %}\n`;
        r = this.parts[2].toNunjucks(context);
        res.text += r.text + '\n';
        res.text += '<figcaption class="image-caption">\n';
        res.text += this.parts[3].toText() + '\n';
        res.text += '</figcaption>\n{% endcall%}\n{% endcall%}\n';
        frontMatter[ph] = [ { title: 'Chart', active: true }, { title: 'Tabelle' } ];

        return res;
    }
}
