const o=Object.assign({});function r(e){const n=e instanceof RegExp?e:new RegExp(String(e),"i");for(const[t,s]of Object.entries(o))if(n.test(t))return s;return null}export{r as findSfxUrl};
