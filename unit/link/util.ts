

function rangeArray(start: number, count: number): number[] {
    return Array.from(Array(count).keys()).map(i => i + start);
}


function toBuffer(data: Array<number|string>): Buffer {
    return Buffer.from(data.map(d => typeof d == "string" ? d.charCodeAt(0) : d));
}
