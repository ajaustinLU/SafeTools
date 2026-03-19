import { useState, useCallback, useMemo } from 'react';
import ToolPage from '../../components/common/ToolPage';
import { ArrowRightLeft } from 'lucide-react';

type Category = 'length' | 'weight' | 'temperature' | 'volume' | 'speed' | 'area' | 'data';

interface UnitDef {
  label: string;
  factor: number;
}

const unitData: Record<Category, Record<string, UnitDef>> = {
  length: {
    mm: { label: 'Millimeters (mm)', factor: 0.001 },
    cm: { label: 'Centimeters (cm)', factor: 0.01 },
    m: { label: 'Meters (m)', factor: 1 },
    km: { label: 'Kilometers (km)', factor: 1000 },
    in: { label: 'Inches (in)', factor: 0.0254 },
    ft: { label: 'Feet (ft)', factor: 0.3048 },
    yd: { label: 'Yards (yd)', factor: 0.9144 },
    mi: { label: 'Miles (mi)', factor: 1609.344 },
  },
  weight: {
    mg: { label: 'Milligrams (mg)', factor: 0.000001 },
    g: { label: 'Grams (g)', factor: 0.001 },
    kg: { label: 'Kilograms (kg)', factor: 1 },
    lb: { label: 'Pounds (lb)', factor: 0.45359237 },
    oz: { label: 'Ounces (oz)', factor: 0.028349523 },
    ton: { label: 'Metric Tons (t)', factor: 1000 },
  },
  temperature: {
    C: { label: 'Celsius (\u00B0C)', factor: 1 },
    F: { label: 'Fahrenheit (\u00B0F)', factor: 1 },
    K: { label: 'Kelvin (K)', factor: 1 },
  },
  volume: {
    mL: { label: 'Milliliters (mL)', factor: 0.001 },
    L: { label: 'Liters (L)', factor: 1 },
    gal: { label: 'Gallons US (gal)', factor: 3.785411784 },
    qt: { label: 'Quarts (qt)', factor: 0.946352946 },
    pt: { label: 'Pints (pt)', factor: 0.473176473 },
    cup: { label: 'Cups (cup)', factor: 0.2365882365 },
    floz: { label: 'Fluid Ounces (fl oz)', factor: 0.0295735296 },
    tbsp: { label: 'Tablespoons (tbsp)', factor: 0.0147867648 },
    tsp: { label: 'Teaspoons (tsp)', factor: 0.0049289216 },
  },
  speed: {
    'ms': { label: 'Meters/second (m/s)', factor: 1 },
    'kmh': { label: 'Kilometers/hour (km/h)', factor: 0.277778 },
    'mph': { label: 'Miles/hour (mph)', factor: 0.44704 },
    'knots': { label: 'Knots (kn)', factor: 0.514444 },
  },
  area: {
    'mm2': { label: 'Square Millimeters (mm\u00B2)', factor: 0.000001 },
    'cm2': { label: 'Square Centimeters (cm\u00B2)', factor: 0.0001 },
    'm2': { label: 'Square Meters (m\u00B2)', factor: 1 },
    'km2': { label: 'Square Kilometers (km\u00B2)', factor: 1000000 },
    'ft2': { label: 'Square Feet (ft\u00B2)', factor: 0.09290304 },
    'acre': { label: 'Acres', factor: 4046.8564224 },
    'ha': { label: 'Hectares (ha)', factor: 10000 },
  },
  data: {
    bit: { label: 'Bits', factor: 1 / 8 },
    B: { label: 'Bytes (B)', factor: 1 },
    KB: { label: 'Kilobytes (KB)', factor: 1024 },
    MB: { label: 'Megabytes (MB)', factor: 1048576 },
    GB: { label: 'Gigabytes (GB)', factor: 1073741824 },
    TB: { label: 'Terabytes (TB)', factor: 1099511627776 },
    PB: { label: 'Petabytes (PB)', factor: 1125899906842624 },
  },
};

const categoryLabels: Record<Category, string> = {
  length: 'Length',
  weight: 'Weight/Mass',
  temperature: 'Temperature',
  volume: 'Volume',
  speed: 'Speed',
  area: 'Area',
  data: 'Data Storage',
};

function convertTemperature(value: number, from: string, to: string): number {
  if (from === to) return value;
  let celsius: number;
  if (from === 'C') celsius = value;
  else if (from === 'F') celsius = (value - 32) * 5 / 9;
  else celsius = value - 273.15;

  if (to === 'C') return celsius;
  if (to === 'F') return celsius * 9 / 5 + 32;
  return celsius + 273.15;
}

export default function UnitConverter() {
  const [category, setCategory] = useState<Category>('length');
  const [fromValue, setFromValue] = useState('1');
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('');

  const units = useMemo(() => unitData[category], [category]);

  const unitKeys = useMemo(() => Object.keys(units), [units]);

  const effectiveFromUnit = useMemo(() => {
    if (fromUnit && unitKeys.includes(fromUnit)) return fromUnit;
    return unitKeys[0] || '';
  }, [fromUnit, unitKeys]);

  const effectiveToUnit = useMemo(() => {
    if (toUnit && unitKeys.includes(toUnit)) return toUnit;
    return unitKeys[1] || unitKeys[0] || '';
  }, [toUnit, unitKeys]);

  const result = useMemo(() => {
    const num = parseFloat(fromValue);
    if (isNaN(num)) return '';
    if (category === 'temperature') {
      return convertTemperature(num, effectiveFromUnit, effectiveToUnit).toLocaleString(undefined, { maximumFractionDigits: 10 });
    }
    const fromFactor = units[effectiveFromUnit]?.factor ?? 1;
    const toFactor = units[effectiveToUnit]?.factor ?? 1;
    const base = num * fromFactor;
    const converted = base / toFactor;
    return converted.toLocaleString(undefined, { maximumFractionDigits: 10 });
  }, [fromValue, effectiveFromUnit, effectiveToUnit, category, units]);

  const handleCategoryChange = useCallback((cat: Category) => {
    setCategory(cat);
    setFromValue('1');
    setFromUnit('');
    setToUnit('');
  }, []);

  const handleSwap = useCallback(() => {
    setFromUnit(effectiveToUnit);
    setToUnit(effectiveFromUnit);
    setFromValue(result || '0');
  }, [effectiveFromUnit, effectiveToUnit, result]);

  return (
    <ToolPage
      toolId="unit-converter"
      howItWorks="Convert values between different units of measurement. Select a category, enter a value, and pick your source and target units. Conversion happens in real time using precise conversion factors through a base-unit intermediary."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(categoryLabels) as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                category === cat
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full space-y-2">
              <label className="text-sm text-slate-400">From</label>
              <input
                type="number"
                value={fromValue}
                onChange={(e) => setFromValue(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Enter value"
              />
              <select
                value={effectiveFromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              >
                {unitKeys.map((key) => (
                  <option key={key} value={key}>{units[key].label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSwap}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-cyan-400 transition-colors"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 w-full space-y-2">
              <label className="text-sm text-slate-400">To</label>
              <div className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm min-h-[38px]">
                {result || '0'}
              </div>
              <select
                value={effectiveToUnit}
                onChange={(e) => setToUnit(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              >
                {unitKeys.map((key) => (
                  <option key={key} value={key}>{units[key].label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {fromValue && !isNaN(parseFloat(fromValue)) && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Quick Reference</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {unitKeys.map((key) => {
                const num = parseFloat(fromValue);
                let converted: number;
                if (category === 'temperature') {
                  converted = convertTemperature(num, effectiveFromUnit, key);
                } else {
                  const fromFactor = units[effectiveFromUnit]?.factor ?? 1;
                  const toFactor = units[key]?.factor ?? 1;
                  converted = (num * fromFactor) / toFactor;
                }
                return (
                  <div key={key} className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">{units[key].label}</div>
                    <div className="text-sm text-slate-200 font-mono">
                      {converted.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
