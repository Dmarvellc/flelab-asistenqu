"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input, InputProps } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRY_CODES = [
  { value: "62", label: "🇮🇩 +62" },
  { value: "1", label: "🇺🇸 +1" },
  { value: "44", label: "🇬🇧 +44" },
  { value: "61", label: "🇦🇺 +61" },
  { value: "65", label: "🇸🇬 +65" },
  { value: "60", label: "🇲🇾 +60" },
  { value: "81", label: "🇯🇵 +81" },
  { value: "82", label: "🇰🇷 +82" },
  { value: "86", label: "🇨🇳 +86" },
  { value: "91", label: "🇮🇳 +91" },
];

export interface PhoneInputProps extends Omit<InputProps, "value" | "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  defaultCountryCode?: string;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, defaultCountryCode = "62", ...props }, ref) => {
    // We try to extract the country code from the value if it exists initially
    const extractInitialState = () => {
      if (!value) return { code: defaultCountryCode, number: "" };
      
      const matchedCode = COUNTRY_CODES.find(c => value.startsWith(c.value));
      if (matchedCode) {
        return { 
          code: matchedCode.value, 
          number: value.slice(matchedCode.value.length) 
        };
      }
      
      return { code: defaultCountryCode, number: value };
    };

    const [countryCode, setCountryCode] = React.useState(extractInitialState().code);
    const [localNumber, setLocalNumber] = React.useState(extractInitialState().number);

    React.useEffect(() => {
        const initialState = extractInitialState();
        setCountryCode(initialState.code);
        setLocalNumber(initialState.number);
    }, [value, defaultCountryCode]);


    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newNumber = e.target.value;
      
      // Auto-strip leading '0'
      if (newNumber.startsWith("0")) {
        newNumber = newNumber.replace(/^0+/, ""); // Remove all leading zeros
      }

      setLocalNumber(newNumber);
      
      if (onChange) {
        // If empty, just send empty string, else combine code and number
        onChange(newNumber ? `${countryCode}${newNumber}` : "");
      }
    };

    const handleCodeChange = (newCode: string) => {
      setCountryCode(newCode);
      if (onChange && localNumber) {
        onChange(`${newCode}${localNumber}`);
      }
    };

    return (
      <div className={cn("flex w-full items-center gap-2", className)}>
        <Select value={countryCode} onValueChange={handleCodeChange}>
          <SelectTrigger className="w-[110px] bg-background">
            <SelectValue placeholder="Code" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((country) => (
              <SelectItem key={country.value} value={country.value}>
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          {...props}
          ref={ref}
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          placeholder={props.placeholder || "813 5781 4360"}
          className="flex-1 bg-background"
        />
      </div>
    );
  }
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
