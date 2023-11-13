import debounce from 'lodash/debounce';
import { useCallback, useMemo, useState } from 'react';

const InputText = ({ label, value, placeholder, onChange }:
  { label: string, value: string, placeholder?: string, onChange: (value: string) => void }) => {

  const [inputValue, setInputValue] = useState(value);

  const updateValue = useCallback((value: string) => {
    onChange(value);
  }, []);

  const debouncedOnChange = useMemo(() => {
    return debounce(updateValue, 1000);
  }, [updateValue]);

  const onChangeValue = (e) => {
    setInputValue(e.target.value);
    debouncedOnChange(e.target.value);
  }

  return (
    <div className='custom-number-input text-right my-2'>
      <div className="flex flex-row text-left justify-between items-center">
        <label className='text-sm'>{label}</label>
        <div className='flex h-10 flex-row overflow-hidden rounded-lg border bg-transparent w-1/2'>
          <input
            type='text'
            value={inputValue}
            className='text-xs placeholder:text-slate-400 md:text-basecursor-default mr-[1px] flex h-9 w-full items-center border-none font-semibold text-gray-700 outline-none hover:text-black focus:text-black focus:outline-none'
            name='custom-input-number'
            placeholder={placeholder}
            onChange={onChangeValue}
          />
        </div>
      </div>
    </div>
  );
}


export default InputText;