import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { BiDollar } from "react-icons/bi";

interface InputProps {
    id: string;
    label: string;
    type?: string;
    disabled?: boolean;
    formatPrice?: boolean;
    required?: boolean;
    register: UseFormRegister<FieldValues>;
    errors?: FieldErrors; // Make errors optional
    placeholder?: string;
    
}

const Input: React.FC<InputProps> = ({
    id,
    label,
    type = 'text',
    disabled,
    formatPrice,
    required,
    register,
    errors = {}, // Provide a default value
}) => {
    return (
        <div className="w-full relative">
            {formatPrice && (
              <span
  className="
    text-neutral-700
    absolute
    top-5
    left-2
    text-2xl
    font-semibold
  "
>
  ₵
</span>

            )}
            <input 
                id={id}
                type={type}
                disabled={disabled}
                {...register(id, { required })}
                placeholder=" "
                className={`
                    peer
                    w-full
                    p-4
                    pt-6
                    font-light
                    bg-white
                    border-2
                    rounded-md
                    outline-none
                    transition
                    disabled:opacity-70
                    disabled:cursor-not-allowed
                    ${formatPrice ? 'pl-9' : 'pl-4'}
                    ${errors?.[id] ? 'border-yellow-500' : 'border-neutral-300'}
                    ${errors?.[id] ? 'focus:border-yellow-500': 'focus:border-black'}
                `}
            />
            <label className={`
                absolute
                text-md
                duration-150
                transform
                -translate-y-3
                top-5
                z-10
                origin-[0]
                ${formatPrice ? 'left-9' : 'left-4'}
                peer-placeholder-shown:scale-100
                peer-placeholder-shown:translate-y-0
                peer-focus:scale-75
                peer-focus:-translate-y-4
                ${errors?.[id] ? 'text-blue-500' : 'text-zinc-400'}
            `}>
                {label}
            </label>
        </div>
    );
}

export default Input;
