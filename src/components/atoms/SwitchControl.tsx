import { Switch } from "@headlessui/react"

const SwitchControl = ({ label, value, onChange }: { label: string, value: boolean, onChange: (value: boolean) => void }) => {
  return (
    <div className='mb-2 flex flex-row items-center'>
      <Switch
        checked={value}
        onChange={onChange}
        className={`${value ? 'bg-[#96BE64]' : 'bg-gray-400'
          } relative inline-flex h-6 w-11 items-center rounded-full`}
      >
        <span className='sr-only'>{label}</span>
        <span
          className={`${value ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition`}
        />
      </Switch>
      <div className='flex flex-row items-center'>
        <button
          className={`group flex flex-row items-center px-2 py-2 text-sm text-gray-900`}
          onClick={() => onChange(!value)}
        >
          {label}
        </button>
      </div>
    </div>
  )
}

export default SwitchControl;