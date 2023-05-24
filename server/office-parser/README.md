# office-to-html-parse

> Übersetze ein (nach Vorgaben formatiertes) Word Dokument auf Nunjucks Input

## Installation

Siehe Installationsanweisungen in ../README.md. Der Parser ist nun Bestandteil des Berichte Frameworks.



## CLI

```sh
$ cd <installationsverzeichnis des Berichte Frameworks>/office-parser
$ ./parse.mjs [ -h dir1 ] [ -x dir2 ] [ -n dir3 ] input.docx
```

* `dir1` **String**: Ausgabeverzeichnis für HTML Output
* `dir2` **String**: Ausgabeverzeichnis für entpackten und formatierten docx Output des Dokuments `input.docx`
* `dir3` **String**: Ausgabeverzeichnis für Nunjucks Output
* `input.docx`: Docx Eingabefile (required)

Alle Ausgabeverzeichnisse werden automatisch angelegt, falls sie noch
nicht vorhanden sind. Sie können absolut oder relativ sein. Die
Ausgabe in das Verzeichnis für Nunjuck Output ist so designed, dass
sie ale Eingabe für das weitere Berichte Framework verwendbar ist, z.B.

```sh
$ cd <installationsverzeichnis des Berichte Frameorks>/office-parser
$ ./parse.mjs -n ../src input.docx
```

Das Ausgabeverzeichnis für Nunjucks Output wird speziell
behandelt. Angenommen, es wird als '../src/' angegeben. Dann werden in
diesem Verzeichnis die folgenden Änderungen vorgenommen:

* Das Verzeichnis '../src/images' wird angelegt, falls es nicht vorhanden ist
* Alle vorhandenen Files in '../src/images' werden gelöscht
* Das Verzeichnis '../src/pages/kapitel/' wird angelegt, falls es nicht vorhanden ist
* Alle Unterverzeichnisse und Files in '../src/pages/kapitel/', die die Regex /^chapter_[0-9]{2}$/ matchen, (alle Namen, die mit 'chapter_' beginnen und mit zwei Ziffern enden) werden rekursiv gelöscht.


## Bugs

Sicher noch einige, bisher wurden erst drei Dokumente getestet, es sollten bald mehr werden.