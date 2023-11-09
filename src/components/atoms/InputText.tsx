const InputNumber = ({ label, value, onChange }: { label: string, value: number, onChange: (value: number) => void }) => {
  const increment = () => {
    onChange(value + 1);
  };

  const decrement = () => {
    if (value > 0) {
      onChange(value - 1);
    }
  };
  return (
    <div className='custom-number-input text-right'>
      <div className="flex flex-row text-left justify-between items-center">
        <label className='text-sm'>{label}</label>
        <div className='flex h-10 flex-row overflow-hidden rounded-lg border bg-transparent w-1/2'>
          <button
            data-action='decrement'
            className='h-full w-20 cursor-pointer rounded-l border-r border-r-gray-200 outline-none hover:bg-[#96BE64] hover:text-white'
            onClick={decrement}
          >
            <span className='m-auto text-2xl font-thin'>-</span>
          </button>
          <input
            type='number'
            className='text-md md:text-basecursor-default mr-[1px] flex h-9 w-full items-center border-none font-semibold text-gray-700 outline-none hover:text-black focus:text-black focus:outline-none'
            name='custom-input-number'
            value={value}
            onChange={(e) => onChange(Number.parseInt(e.target.value))}
          />
          <button
            data-action='increment'
            className='h-full w-20 cursor-pointer rounded-r border-l border-l-gray-200 hover:bg-[#96BE64] hover:text-white'
            onClick={increment}
          >
            <span className='m-auto text-2xl font-thin'>+</span>
          </button>
        </div>
      </div>
      <label className='text-xs'>
        {toHoursAndMinutes(value)}
      </label>
    </div>
  );
}

function toHoursAndMinutes(totalSeconds: number) {
  const totalMinutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

export default InputNumber;