const { createProjectGraphAsync } = require('nx/src/project-graph/project-graph');
const { HashPlanInspector } = require('nx/src/hasher/hash-plan-inspector');
(async () => {
  const graph = await createProjectGraphAsync({ exitOnError: false });
  const insp = new HashPlanInspector(graph);
  await insp.init();
  const project = process.argv[2], t = process.argv[3];
  const res = insp.inspectTaskInputs({ project, target: t });
  const key = Object.keys(res).find(k => k.startsWith(project + ':' + t)) || Object.keys(res)[0];
  const inputs = res[key];
  console.log('### TASK:', key);
  for (const cat of Object.keys(inputs)) {
    const v = inputs[cat]; const arr = Array.isArray(v) ? v : [v];
    console.log(`\n--- ${cat} (${arr.length}) ---`);
    if (cat === 'files') console.log(arr.slice(0,4).join('\n') + `\n  ...(${arr.length} total)`);
    else console.log(JSON.stringify(arr, null, 1).slice(0, 2500));
  }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
