export interface NumberOverflow {
    boundary: 'min' | 'max' | 'invalid';
    boundaryValue?: number;
    inputValue?: number;
}