
export function matchPrefix(a: string, b: string) {
    let prefix = "";
    for(let i = 0; i < Math.min(a.length, b.length); i++) {
        if(a[i] === b[i]) prefix += a[i];
        else break;
    }
    return prefix;
}