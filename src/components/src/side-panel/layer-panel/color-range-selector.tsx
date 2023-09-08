// Copyright (c) 2023 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React, {Component, MouseEvent} from 'react';
import uniq from 'lodash.uniq';
import styled from 'styled-components';
import {createSelector} from 'reselect';

import ItemSelector from '../../common/item-selector/item-selector';
import {PanelLabel} from '../../common/styled-components';
import Switch from '../../common/switch';
import ColorPalette from './color-palette';
import CustomPalette from './custom-palette';
import {COLOR_RANGES, ColorRange} from '@kepler.gl/constants';
import {reverseColorRange, numberSort} from '@kepler.gl/utils';
import {FormattedMessage} from '@kepler.gl/localization';
import {NestedPartial, ColorUI} from '@kepler.gl/types';

type ColorRangeSelectorProps = {
  colorPaletteUI: ColorUI;
  selectedColorRange: ColorRange;
  colorDomain?: string[] | number[];
  onSelectColorRange: (p: ColorRange, e: MouseEvent) => void;
  setColorPaletteUI: (newConfig: NestedPartial<ColorUI>) => void;
};

type PaletteConfigProps = {
  label: string;
  value: string | number | boolean;
  config: {
    type: string;
    options: (string | number | boolean)[];
  };
  onChange: (v: string | number | boolean | object | null) => void;
};

type ColorPaletteGroupProps = {
  reversed?: boolean;
  selected: ColorRange;
  colorRanges: ColorRange[];
  onSelect: (p: ColorRange, e: MouseEvent) => void;
};

export const ALL_TYPES: string[] = uniq(
  COLOR_RANGES.map(c => c.type)
    .filter(ctype => ctype)
    .concat(['all', 'custom']) as string[]
);

export const ALL_STEPS: number[] = uniq(COLOR_RANGES.map(d => d.colors.length)).sort(numberSort);

const StyledColorConfig = styled.div`
  padding: 12px 12px 0 12px;
`;

const StyledColorRangeSelector = styled.div.attrs({
  className: 'color-range-selector'
})`
  padding-bottom: 12px;
`;

const StyledPaletteConfig = styled.div`
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  .color-palette__config__label {
    flex-grow: 1;
  }
  .color-palette__config__select {
    flex-grow: 1;
  }
  .item-selector .item-selector__dropdown {
    ${props => props.theme.secondaryInput};
  }
`;

const CONFIG_SETTINGS = {
  type: {
    type: 'select',
    options: ALL_TYPES
  },
  steps: {
    type: 'select',
    options: ALL_STEPS
  },
  reversed: {
    type: 'switch',
    options: [true, false]
  },
  custom: {
    label: 'customPalette',
    type: 'switch',
    options: [true, false]
  }
};

export default class ColorRangeSelector extends Component<ColorRangeSelectorProps> {

  state = {
    isCustomDomain: this.props.colorPaletteUI.customPalette.colorMap ? true : false,
    colorThresholds: this.props.colorPaletteUI.customPalette.colorMap ? this._fromColorMap() : this._init(),
  };

  _fromColorMap() {
    const {colorMap} = this.props.colorPaletteUI.customPalette;
    const getEditableThreshold = (k) => (k && k.length > 0 && typeof k[0] === 'string') 
      ? k[0].split(' to ').pop()
      : null;
    const thresholds = colorMap.map(getEditableThreshold);
    thresholds.pop(); // The last one is not editable as it is the maxima
    return thresholds;
  }
  
  _init() {
    const {colorDomain} = this.props;

    if (!colorDomain) {
      return [];
    }
    
    const length = this.props.colorPaletteUI.colorRangeConfig.steps;
    const min = typeof colorDomain[0] === "string" ? parseInt(colorDomain[0]) : colorDomain[0];
    const max = typeof colorDomain[1] === "string" ? parseInt(colorDomain[1]) : colorDomain[1];

    const getDecimalPlaces = (num: number) => {
      if (Number.isInteger(num)) {
        return 0;
      }
      return num.toString().split('.')[1].length;
    };

    const decimals = Math.max(getDecimalPlaces(min), getDecimalPlaces(max));

    const roundDown = (num: number) => {
      return decimals ? parseFloat(num.toFixed(decimals)) : parseInt(num.toFixed());
    }

    const increment = roundDown((max - min) / length);
    return new Array(length).fill(undefined).map((v, i) => (i === length - 1) ? max : roundDown(min + increment * (i + 1))) as number[];
  }

  static defaultProps = {
    onSelectColorRange: () => {},
    setColorPaletteUI: () => {}
  };

  configTypeSelector = (props: ColorRangeSelectorProps) =>
    props.colorPaletteUI.colorRangeConfig.type;
  configStepSelector = (props: ColorRangeSelectorProps) =>
    props.colorPaletteUI.colorRangeConfig.steps;
  filteredColorRange = createSelector(
    this.configTypeSelector,
    this.configStepSelector,
    (type, steps) => {
      return COLOR_RANGES.filter(colorRange => {
        const isType = type === 'all' || type === colorRange.type;
        const isStep = Number(steps) === colorRange.colors.length;

        return isType && isStep;
      });
    }
  );

  _updateConfig = ({
    key,
    value
  }: {
    key: string;
    value: string | number | boolean | object | null;
  }) => {
    this._setColorRangeConfig({[key]: value});
    // TODO: update colorMap with new thresholds
  };

  _onSetCustomPalette = (config: NestedPartial<ColorRange>) => {
    this.props.setColorPaletteUI({
      customPalette: config
    });
  };

  _setColorRangeConfig = (newConfig: Record<string, string | number | boolean | object | null>) => {
    this.props.setColorPaletteUI({
      colorRangeConfig: newConfig
    });
  };

  _onCustomPaletteCancel = () => {
    this.props.setColorPaletteUI({
      showSketcher: false,
      colorRangeConfig: {custom: false}
    });
  };

  _onToggleSketcher = (val: boolean | number) => {
    this.props.setColorPaletteUI({
      showSketcher: val
    });
  };

  _setColorThresholds(index, {target: {value}}) {
    if (this.props.colorDomain) {
      const colorThresholds = [...this.state.colorThresholds];
      colorThresholds[index] = value;
      this.setState({colorThresholds});

      const {colorPaletteUI}= {...this.props}
      const {colors} = colorPaletteUI.customPalette;
      const minima = this.props.colorDomain[0];
      const maxima = this.props.colorDomain[this.props.colorDomain.length - 1];
      const isFirst = (i) => i === 0;
      const isLast = (i, obj) => i === obj.length - 1;

      const colorMap = colors.map((c, i, self) => {
        const minOfRange = isFirst(i) ? minima : colorThresholds[i-1];
        const maxOfRange = isLast(i, self) ? maxima : colorThresholds[i];
        return [`${minOfRange} to ${maxOfRange}` , c];
      });

      colorPaletteUI.customPalette.colorMap = colorMap;

      this.props.setColorPaletteUI(colorPaletteUI);
    }
  }

  render() {
    const {isCustomDomain, colorThresholds} = this.state;
    const {customPalette, showSketcher, colorRangeConfig} = this.props.colorPaletteUI;
    const {colorDomain} = this.props;
    const filteredColorRanges = this.filteredColorRange(this.props);
    return (
      <StyledColorRangeSelector>
        <StyledColorConfig>
          {(colorRangeConfig.custom ? ['custom'] : Object.keys(colorRangeConfig)).map(key => (
            <PaletteConfig
              key={key}
              label={CONFIG_SETTINGS[key].label || key}
              config={CONFIG_SETTINGS[key]}
              value={colorRangeConfig[key]}
              onChange={value => this._updateConfig({key, value})}
            />
          ))}
          {colorRangeConfig.custom && (
            <StyledPaletteConfig className="color-palette__config" onClick={e => e.stopPropagation()}>
              <PanelLabel>
                <FormattedMessage 
                  id="custom-color-domain-label" 
                  defaultMessage="Custom Domain"
                />
              </PanelLabel>
              <Switch
                id="custom-color-domain-switch"
                checked={isCustomDomain}
                onChange={() => this.setState({isCustomDomain: !isCustomDomain})}
                secondary
              />
            </StyledPaletteConfig>
          )}
        </StyledColorConfig>

        {colorRangeConfig.custom ? (
          <CustomPalette
            customPalette={customPalette}
            isCustomDomain={isCustomDomain}
            colorDomain={colorDomain}
            colorThresholds={colorThresholds}
            showSketcher={showSketcher}
            onApply={this.props.onSelectColorRange}
            onToggleSketcher={this._onToggleSketcher}
            setCustomPalette={this._onSetCustomPalette}
            onCancel={this._onCustomPaletteCancel}
            setColorThresholds={(i, e) => this._setColorThresholds(i, e)}
          />
        ) : (
          <ColorPaletteGroup
            colorRanges={filteredColorRanges}
            onSelect={this.props.onSelectColorRange}
            selected={this.props.selectedColorRange}
            reversed={colorRangeConfig.reversed}
          />
        )}
      </StyledColorRangeSelector>
    );
  }
}

export const PaletteConfig: React.FC<PaletteConfigProps> = ({
  label,
  value,
  config: {type, options},
  onChange
}) => (
  <StyledPaletteConfig className="color-palette__config" onClick={e => e.stopPropagation()}>
    <div className="color-palette__config__label">
      <PanelLabel>
        <FormattedMessage id={`color.${label}`} />
      </PanelLabel>
    </div>
    {type === 'select' && (
      <div className="color-palette__config__select">
        <ItemSelector
          selectedItems={value}
          options={options}
          multiSelect={false}
          searchable={false}
          onChange={onChange}
        />
      </div>
    )}
    {type === 'switch' && (
      <Switch
        checked={value as boolean}
        id={`${label}-toggle`}
        onChange={() => onChange(!value)}
        secondary
      />
    )}
  </StyledPaletteConfig>
);

const StyledColorRange = styled.div.attrs({
  className: 'color-palette-outer'
})`
  padding: 0 8px;
  :hover {
    background-color: ${props => props.theme.panelBackgroundHover};
    cursor: pointer;
  }
`;

export const ColorPaletteGroup: React.FC<ColorPaletteGroupProps> = ({
  reversed,
  onSelect,
  selected,
  colorRanges
}) => (
  <div className="color-palette__group">
    {colorRanges.map((colorRange, i) => (
      <StyledColorRange
        key={`${colorRange.name}-${i}`}
        onClick={e =>
          onSelect(reversed ? (reverseColorRange(true, colorRange) as ColorRange) : colorRange, e)
        }
      >
        <ColorPalette
          colors={colorRange.colors}
          isReversed={reversed}
          isSelected={colorRange.name === selected.name && reversed === Boolean(selected.reversed)}
        />
      </StyledColorRange>
    ))}
  </div>
);
