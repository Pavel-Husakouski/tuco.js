/*
ABNF (RFC 5234), описанный самим ABNF — мета-грамматика.

; --- Базовые правила (RFC 5234, Appendix B.1) ---
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

; --- ABNF, определённый через ABNF (RFC 5234, section 4) ---
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
*/
