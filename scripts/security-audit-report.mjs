import { readFileSync } from 'node:fs'
function audit(file) {
  try { return JSON.parse(readFileSync(file,'utf8')) }
  catch { return { error: 'Missing or invalid npm audit report', vulnerabilities: {}, metadata: {} } }
}
function rows(result) {
  const priorities=['critical','high','moderate','low','info']
  return Object.entries(result.vulnerabilities ?? {})
    .filter(([,item])=>item && typeof item === 'object')
    .sort((a,b)=>priorities.indexOf(a[1].severity)-priorities.indexOf(b[1].severity))
    .map(([name,item])=>({name,severity:item.severity,direct:item.isDirect === true,fix:item.fixAvailable}))
}
const all=audit(process.argv[2]), production=audit(process.argv[3])
function print(title, result) {
  const packages=rows(result)
  console.log('\n## '+title)
  console.log('Reported counts: '+JSON.stringify(result.metadata?.vulnerabilities ?? {}))
  if(result.error) console.log('WARNING: '+result.error)
  console.log('| Dependency | Severity | Direct | Fix available |')
  console.log('| --- | --- | --- | --- |')
  for(const item of packages) {
    const fix=item.fix===true?'yes':item.fix===false?'no':(typeof item.fix==='object'?'requires version review':'unknown')
    console.log('| '+item.name.replaceAll('|','')+' | '+item.severity+' | '+(item.direct?'yes':'transitive')+' | '+fix+' |')
  }
  console.log('\nReview advisories and major changes before upgrading. Do not run npm audit fix --force blindly.')
}
print('Development and production dependencies',all)
print('Production dependencies only',production)
