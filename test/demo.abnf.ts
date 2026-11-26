/*
Мета-демо: ABNF (RFC 5234), распарсенный самим tuco.

`source` ниже — грамматика ABNF, записанная в ABNF (core rules + ABNF-через-ABNF).
Парсер `rulelist` собран из комбинаторов tuco и разбирает `source` в AST,
который проверяется в тестах ниже.

Осознанные упрощения (парсер принимает чуть меньше, чем строгий RFC 5234):
- перевод строки принимается и как `\r\n`, и как `\n` (не требую строго CRLF);
- продолжение правила на следующей (с отступом) строке не поддержано: внутри
  правила пробелы — только SP/HTAB, перевод строки завершает правило; строки-
  комментарии между правилами пропускаются;
- разделитель между повторениями в concatenation — любое число SP/HTAB, в т.ч. ноль
  (жадный `rulename` не даёт двум словам слиться в одно);
- диапазоны `%x..-..` / `%d..` / `%b..` хранятся как структура
  `{kind:'num', base, values, range}`, а не разворачиваются в набор символов;
- тело char-val / prose-val / комментариев не валидируется посимвольно по RFC
  (берётся «всё, кроме разделителя и перевода строки»).
*/

import assert from 'node:assert';
import {
    all, between, charExcept, charIs, charMeets, charOneOf, first,
    optional, or, rep0, rep1, second, word
} from '../src/tuco.ts';

// ---- источник: ABNF-грамматика ABNF (RFC 5234) ----
const source = `
ALPHA          =  %x41-5A / %x61-7A   ; A-Z / a-z
BIT            =  "0" / "1"
CHAR           =  %x01-7F            ; любой 7-битный US-ASCII символ, кроме NUL
CR             =  %x0D               ; carriage return
CRLF           =  CR LF              ; стандартный перевод строки
CTL            =  %x00-1F / %x7F     ; управляющие символы
DIGIT          =  %x30-39            ; 0-9
DQUOTE         =  %x22               ; " (двойная кавычка)
HEXDIG         =  DIGIT / "A" / "B" / "C" / "D" / "E" / "F"
HTAB           =  %x09               ; горизонтальная табуляция
LF             =  %x0A               ; linefeed
OCTET          =  %x00-FF            ; 8 бит данных
SP             =  %x20               ; пробел
VCHAR          =  %x21-7E            ; видимые (печатные) символы
WSP            =  SP / HTAB          ; whitespace: пробел или табуляция

rulelist       =  1*( rule / (*c-wsp c-nl) )

rule           =  rulename defined-as elements c-nl
               ; правило продолжается, если следующая строка начинается с whitespace

rulename       =  ALPHA *(ALPHA / DIGIT / "-")

defined-as     =  *c-wsp ("=" / "=/") *c-wsp
               ; "=" — базовое определение, "=/" — инкрементальная альтернатива

elements       =  alternation *c-wsp

c-wsp          =  WSP / (c-nl WSP)   ; комментарий и/или whitespace

c-nl           =  comment / CRLF

comment        =  ";" *(WSP / VCHAR) CRLF

alternation    =  concatenation *(*c-wsp "/" *c-wsp concatenation)

concatenation  =  repetition *(1*c-wsp repetition)

repetition     =  [repeat] element

repeat         =  1*DIGIT / (*DIGIT "*" *DIGIT)
               ; 3 — ровно 3, *3 — 0..3, 1*3 — 1..3, * — 0..∞

element        =  rulename / group / option / char-val / num-val / prose-val

group          =  "(" *c-wsp alternation *c-wsp ")"

option         =  "[" *c-wsp alternation *c-wsp "]"   ; то же, что *1(...)

char-val       =  DQUOTE *(%x20-21 / %x23-7E) DQUOTE
               ; строка из SP и VCHAR без DQUOTE

num-val        =  "%" (bin-val / dec-val / hex-val)

bin-val        =  "b" 1*BIT [ 1*("." 1*BIT) / ("-" 1*BIT) ]

dec-val        =  "d" 1*DIGIT [ 1*("." 1*DIGIT) / ("-" 1*DIGIT) ]

hex-val        =  "x" 1*HEXDIG [ 1*("." 1*HEXDIG) / ("-" 1*HEXDIG) ]

prose-val      =  "<" *(%x20-3D / %x3F-7E) ">"
               ; прозаическое описание — последнее средство, в угловых скобках
`;

// ---- базовые символьные классы ----
const isAlpha  = function(c){ return /[A-Za-z]/.test(c); };
const isDigit  = function(c){ return /[0-9]/.test(c); };
const isHexdig = function(c){ return /[0-9A-Fa-f]/.test(c); };

const ALPHA  = charMeets(isAlpha, 'ALPHA');
const DIGIT  = charMeets(isDigit, 'DIGIT');
const HEXDIG = charMeets(isHexdig, 'HEXDIG');
const BIT    = charOneOf('01');
const SP     = charIs(' ');
const HTAB   = charIs('\t');
const WSP    = or(SP, HTAB);
const LF     = charIs('\n');
const CRLF   = or(word('\r\n'), LF);   // упрощение: и \r\n, и \n
const DQUOTE = charIs('"');

// ---- пробелы, переводы строк, комментарии ----
const comment = all(charIs(';'), rep0(charExcept('\n')), CRLF);
const ws = rep0(WSP);                          // inline: только пробелы и табуляции
const spacing = rep0(or(WSP, CRLF, comment));  // полный: пробелы + переводы строк + комментарии

function lex(p){ return first(p, ws); }   // распарсить p и пропустить хвостовые пробелы/табуляции

function join(xs){ return xs === null ? '' : xs.join(''); }

// ---- атомарные токены (каждый с хвостовым spacing) ----

// rulename = ALPHA *(ALPHA / DIGIT / "-")
const rulename = lex(all(ALPHA, rep0(or(ALPHA, DIGIT, charIs('-')))))
    .map(function(v){ return v[0] + (v[1] === null ? '' : v[1].join('')); });

// char-val = DQUOTE *(%x20-21 / %x23-7E) DQUOTE
const charVal = lex(between(DQUOTE, rep0(charExcept('"\n')).map(join), DQUOTE))
    .map(function(s){ return { kind:'char', value: s }; });

// prose-val = "<" *(%x20-3D / %x3F-7E) ">"
const proseVal = lex(between(charIs('<'), rep0(charExcept('>\n')).map(join), charIs('>')))
    .map(function(s){ return { kind:'prose', value: s }; });

// num-val = "%" (bin-val / dec-val / hex-val)
function numBody(digit){
    const d = rep1(digit).map(join);              // 1*DIGIT
    const range = second(charIs('-'), d);         // "-" 1*DIGIT
    const seq = rep1(second(charIs('.'), d));     // 1*("." 1*DIGIT)
    return all(d, optional(or(range, seq)));
}

function toNum(base){
    return function(body){
        // body = [first, tail], tail = строка (range) | массив (seq) | null
        const first = body[0], tail = body[1];
        let values, range = false;
        if(tail === null)
            values = [first];
        else if(typeof tail === 'string'){
            values = [first, tail]; range = true;
        } else
            values = [first].concat(tail);
        return { kind:'num', base: base, values: values, range: range };
    };
}

const numVal = lex(second(charIs('%'), or(
    second(charIs('b'), numBody(BIT)).map(toNum('b')),
    second(charIs('d'), numBody(DIGIT)).map(toNum('d')),
    second(charIs('x'), numBody(HEXDIG)).map(toNum('x'))
)));

// defined-as = *c-wsp ("=" / "=/") *c-wsp
const definedAs = lex(or(word('=/'), word('=')));

// ---- взаиморекурсивные правила (forward-объявления) ----
let alternationImpl: any = null;
const alternation   = function(x){ return alternationImpl(x); };
let concatenationImpl: any = null;
const concatenation = function(x){ return concatenationImpl(x); };
let repetitionImpl: any = null;
const repetition    = function(x){ return repetitionImpl(x); };
let elementImpl: any = null;
const element       = function(x){ return elementImpl(x); };
let groupImpl: any = null;
const group         = function(x){ return groupImpl(x); };
let optionImpl: any = null;
const option        = function(x){ return optionImpl(x); };

// repeat = 1*DIGIT / (*DIGIT "*" *DIGIT)
const repeat = or(
    all(rep0(DIGIT), charIs('*'), rep0(DIGIT)).map(function(v){
        return {
            min: v[0] === null ? 0 : parseInt(v[0].join(''), 10),
            max: v[2] === null ? Infinity : parseInt(v[2].join(''), 10)
        };
    }),
    rep1(DIGIT).map(function(ds){
        const n = parseInt(ds.join(''), 10);
        return { min: n, max: n };
    })
);

// group = "(" *c-wsp alternation *c-wsp ")"
groupImpl = lex(between(first(charIs('('), ws), alternation, charIs(')')))
    .map(function(alt){ return { kind:'group', alt: alt }; });

// option = "[" *c-wsp alternation *c-wsp "]"
optionImpl = lex(between(first(charIs('['), ws), alternation, charIs(']')))
    .map(function(alt){ return { kind:'option', alt: alt }; });

// element = rulename / group / option / char-val / num-val / prose-val
elementImpl = or(
    rulename.map(function(n){ return { kind:'rulename', name: n }; }),
    group, option, charVal, numVal, proseVal
);

// repetition = [repeat] element
repetitionImpl = all(optional(repeat), element)
    .map(function(v){ return { repeat: v[0], el: v[1] }; });

// concatenation = repetition *(1*c-wsp repetition)
concatenationImpl = rep1(repetition);

// alternation = concatenation *(*c-wsp "/" *c-wsp concatenation)
alternationImpl = all(concatenation, rep0(all(lex(charIs('/')), concatenation)))
    .map(function(v){
        const rest = v[1] === null ? [] : v[1].map(function(pair){ return pair[1]; });
        return [v[0]].concat(rest);
    });

// rule = rulename defined-as elements c-nl
const rule = all(rulename, definedAs, alternation, or(comment, CRLF))
    .map(function(v){ return { name: v[0], op: v[1], alt: v[2] }; });

// rulelist = 1*( rule / (*c-wsp c-nl) )
const rulelist = first(rep1(second(spacing, rule)), spacing);

// ---- тесты ----
function byName(rules){
    const map: any = {};
    rules.forEach(function(r){ map[r.name] = r; });
    return map;
}

describe('abnf (meta-demo)', function(){
    let rules: any = null;   // распарсенный AST rulelist(source), общий для тестов

    it('parses the full ABNF self-description', function(){
        const result = rulelist(source);
        if ('failed' in result) throw new Error('expected success');
        assert.strictEqual(result.rest, '');
        rules = result.value;
    });

    it('collects core and meta rules by name', function(){
        const map = byName(rules);
        assert(map.ALPHA && map.DIGIT && map.CRLF && map.WSP);
        assert(map.rule && map.rulelist && map.alternation && map.concatenation && map.repetition);
        assert(map['char-val'] && map['num-val'] && map['prose-val']);
    });

    it('parses CRLF as the concatenation CR LF', function(){
        const map = byName(rules);
        const crlf = map.CRLF.alt[0];
        assert.deepEqual(crlf.map(function(r){ return r.el; }), [
            { kind:'rulename', name:'CR' },
            { kind:'rulename', name:'LF' }
        ]);
    });

    it('parses a range repetition and a num-val', function(){
        const result = rulelist('x = 1*3DIGIT / %x41-5A\n');
        if ('failed' in result) throw new Error('expected success');
        assert.strictEqual(result.rest, '');
        const alt = result.value[0].alt;
        assert.deepEqual(alt[0][0].repeat, { min:1, max:3 });
        assert.deepEqual(alt[1][0].el, { kind:'num', base:'x', values:['41','5A'], range:true });
    });

    it('parses group, option and prose-val', function(){
        const result = rulelist('x = (a / b) [c] <free text>\n');
        if ('failed' in result) throw new Error('expected success');
        assert.strictEqual(result.rest, '');
        const el = result.value[0].alt[0];
        assert.deepEqual(el.map(function(r){ return r.el.kind; }), ['group', 'option', 'prose']);
    });
});
