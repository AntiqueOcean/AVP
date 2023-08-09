export function addListener(_id, _action, _function, _pass = []) {
    const _element = document.getElementById(_id);

        var _code = "";
        if(_pass.length == 0) {
            _code = `_element.addEventListener(_action, _function);`;
            eval(_code);
        }
        else {
            _code = `_element.addEventListener(_action, function(_e = this) {_function(`;
            for (var i = 0; i < _pass.length; i++) {
                if (i != _pass.length-1)
                    _code += `getArg(_e, _pass, ${i}),`;
                else
                    _code += `getArg(_e, _pass, ${i}))});`;
            }
        }
        eval(_code);
  }

  function getArg(_event, _array, _index) {
    if (_array[_index] == "!event") {
        return _event;
    }
    else {
        return _array[_index];
    }
  }
