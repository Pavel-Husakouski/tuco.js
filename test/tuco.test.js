var assert = require("assert");
var tuco = require('../tuco');

eval(tuco.nsImport('tuco'));

describe('map', function() {
    it('map not null', function(){
        var parse = all(word('first'), word('second'), word('third'))
                    .map(function(values) {
                        return values.join('.');
                    });
        var r = parse('firstsecondthirdrest');
        
        assert(r != null);
        assert(r.value == 'first.second.third');
        assert(r.rest == 'rest');
    });
    
    it('map null', function(){
        var parse = all(word('first'), word('second'), word('third'))
                    .map(function(values) {
                        return values.join('.');
                    });
        var r = parse('zerofirstsecondthird');
        
        assert(r == null);
    })
});

describe('alternation',function(){
    it('or first not null', function(){
        var parse = or(word('first'), word('second'), word('third'));
        var r = parse('firstsecondthird');
        
        assert(r != null);
        assert(r.value == 'first');
        assert(r.rest == 'secondthird');
    });

    it('or second not null', function(){
        var parse = or(word('first'), word('second'), word('third'));
        var r = parse('secondfirstthird');
        
        assert(r != null);
        assert(r.value == 'second');
        assert(r.rest == 'firstthird');
    });
    
    it('or third not null', function(){
        var parse = or(word('first'), word('second'), word('third'));
        var r = parse('thirdfirstsecond');
        
        assert(r != null);
        assert(r.value == 'third');
        assert(r.rest == 'firstsecond');
    });
    
    it('or all null', function(){
        var parse = or(word('first'), word('second'), word('third'));
        var r = parse('fourththirdfirstsecond');
        
        assert(r == null);
    })
});

describe('repetition', function(){
    it('rep1 not null',function(){
        var parse = rep1(charIs('x'));
        var r = parse('xxxxzzzz');
        
        assert(r != null);
        assert(r.value.length == 4);
        assert(r.rest == 'zzzz');
    });
    
    it('rep1 null',function(){
        var parse = rep1(charIs('x'));
        var r = parse('');
        
        assert(r == null);
    });
    
    it('rep1 single not null',function(){
        var parse = rep1(charIs('x'));
        var r = parse('xy');
        
        assert(r != null);
        assert(r.value.length == 1);
        assert(r.rest == 'y');
    });

    it('rep0 not null',function(){
        var parse = rep0(charIs('x'));
        var r = parse('xxxxzzzz');
        
        assert(r != null);
        assert(r.value.length == 4);
        assert(r.rest == 'zzzz');
    });
    
    it('rep0 can\'t be null',function(){
        var parse = rep0(charIs('x'));
        var r = parse('zzz');
        
        assert(r != null);
        assert(r.value == null);
        assert(r.rest == 'zzz');
    });
    
    it('rep0 single not null',function(){
        var parse = rep1(charIs('x'));
        var r = parse('xzzz');
        
        assert(r != null);
        assert(r.value.length == 1);
        assert(r.rest == 'zzz');
    })
});


describe ('option',function(){
    it('optional not null', function(){
        var parse = optional(word('text'));
        var r = parse('text and etc.');
        
        assert(r != null);
        assert(r.value == 'text');
        assert(r.rest == ' and etc.');
    });
    
    it('optional can\'t be null', function(){
        var parse = optional(word('text'));
        var r = parse('xxx text and etc.');
        
        assert(r != null);
        assert(r.value == null);
        assert(r.rest == 'xxx text and etc.');
    })
});

describe('optional implicit `all` for the arguments', function(){
    it('value null when no match', function(){
        var parse = optional(word('text'), word('text'));
        var r = parse('text and etc.');
        
        assert(r != null);
        assert(r.value == null);
        assert(r.rest == 'text and etc.');
    });

    it('value not null when match', function(){
        var parse = optional(word('text'), word('text'));
        var r = parse('texttext and etc.');
        
        assert(r.value.join('') == 'texttext', r.value);
        assert(r.rest == ' and etc.');
    });
});

describe('charXXX', function(){
    it('charExcept not null',function(){
        var parse = charExcept("");
        var r = parse('x123');
    
        assert(r.value == 'x' && r.rest == '123');
    }) ;
    
    it('charExcept null',function(){
        var parse = charExcept("x");
        var r = parse('x123');
    
        assert(r == null);
    });
    
    it('charOneOF not null',function(){
        var parse = charOneOf("xyz");
        var r = parse('x123');
    
        assert(r.value == 'x' && r.rest == '123');
    });

   it('charOneOF null',function(){
        var parse = charOneOf("xyz");
        var r = parse('123');
    
        assert(r == null);
    });

    it('charMeets not null',function(){
        var parse = charMeets(function(ch) { return ch == 'x'; });
        var r = parse('xyz');
    
        assert(r.value == 'x' && r.rest == 'yz');
    });

    it('charMeets null',function(){
        var parse = charMeets(function(ch) { return false; });
        var r = parse('xyz');
    
        assert(r == null);
    });
    
    it('charIs("x") not null',function(){
        var parse = charIs('x');
        var r = parse('xyz');
    
        assert(r.value == 'x' && r.rest == 'yz');
    });
    
    it('charIs("x") null',function(){
        var parse = charIs('x');
        var r = parse('1yz');
    
        assert(r == null);
    })
});

describe('all', function(){
    it('word not null',function(){
        var parse = word('text');
        var r = parse('text and etc.');
        
        assert(r != null);
        assert(r.value == 'text');
        assert(r.rest == ' and etc.');
    });

    it('word null',function(){
        var parse = word('text');
        var r = parse('zzztext and etc.');
        
        assert(r == null);
    });
    
    it('between not null',function(){
        var parse = between(charIs('('), charOneOf('xyz'), charIs(')'));
        var r = parse('(x)xxx');
        
        assert(r != null);
        assert(r.value == 'x');
        assert(r.rest == 'xxx');
    });

    it('between null',function(){
        var parse = between(charIs('('), charOneOf('xyz'), charIs(')'));
        var r = parse('(1)xxx');
        
        assert(r == null);
    });

    it('second not null',function(){
        var parse = second(charIs('\\'), charOneOf('xyz'));
        var r = parse('\\xxxx');
        
        assert(r != null);
        assert(r.value == 'x');
        assert(r.rest == 'xxx');
    });

    it('second null',function(){
        var parse = second(charIs('\\'), charOneOf('xyz'));
        var r = parse('/xxxx');
        
        assert(r == null);
    });
    
    it('all not null',function(){
        var parse = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        var r = parse('xyz1rest');
        
        assert(r != null);
        assert.equal(4, r.value.length);
        assert(r.rest == 'rest');
        assert(r.value[0] == 'x');
        assert(r.value[1] == 'y');
        assert(r.value[2] == 'z');
        assert(r.value[3] == '1');
    });

    it('all first null',function(){
        var parse = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        var r = parse('_yz1rest');
        
        assert(r == null);
    });

    it('all second null',function(){
        var parse = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        var r = parse('x_z1rest');
        
        assert(r == null);
    });
    
    it('all third null',function(){
        var parse = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        var r = parse('xy_1rest');
        
        assert(r == null);
    });
    
    it('all fourth null',function(){
        var parse = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        var r = parse('xyz_rest');
        
        assert(r == null);
    });

    it('all empty null',function(){
        var parse = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        var r = parse('');
        
        assert(r == null);
    })
});

describe('anyChar', function(){
    it('parser should be not null', function(){
        assert(null != anyChar());
    });

    it('123 should return not null', function(){
        assert(null != anyChar()('123'));
    });

    it('123 should return value and rest', function(){
        var result = anyChar()('123');
        
        assert(result.value == '1' && result.rest == '23' );
    });

    it('empty string should return null', function(){
        assert(null == anyChar()(''));
    });

    it('null should return null', function(){
        assert(null == anyChar()(null));
    })
});