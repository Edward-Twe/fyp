"use client"

import React, { useEffect, useRef } from 'react'
import { Input } from "@/components/ui/input"
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { UseFormReturn } from "react-hook-form"
import { JobOrderValues } from "@/lib/validation"

declare global {
  interface Window {
    google: any;
    initAutocomplete: () => void;
  }
}

interface AddressAutocompleteProps {
  form: UseFormReturn<JobOrderValues>
}

let isScriptLoaded = false;

export default function AddressAutocomplete({ form }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isScriptLoaded) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initAutocomplete`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
      isScriptLoaded = true;

      return () => {
        document.head.removeChild(script)
        isScriptLoaded = false;
      }
    }

    window.initAutocomplete = () => {
      if (inputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, { types: ['address'] })
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          form.setValue('address', place.formatted_address || '')
          form.setValue('latitude', place.geometry?.location.lat() || 0)
          form.setValue('longitude', place.geometry?.location.lng() || 0)
        })
      }
    }

    if (window.google && window.google.maps) {
      window.initAutocomplete();
    }
  }, [form])

  return (
    <FormItem>
      <FormLabel>Address</FormLabel>
      <FormControl>
        <Input
          {...form.register('address')}
          placeholder="Enter your address"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )
}

