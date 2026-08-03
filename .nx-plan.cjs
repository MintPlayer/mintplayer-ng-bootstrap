const { createProjectGraphAsync } = require('nx/src/project-graph/project-graph');
const { HashPlanInspector } = require('nx/src/hasher/hash-plan-inspector');
(async () => {
  const graph = await createProjectGraphAsync({ exitOnError: false });
  const insp = new HashPlanInspector(graph);
  await insp.init();
  const res = insp.inspectTask({ project: 'mintplayer-web-components', target: 'build' });
  const key = Object.keys(res).find(k => k.startsWith('mintplayer-web-components:build'));
  const plan = res[key];
  // show every non-file plan entry (files are the bulk)
  const nonFile = plan.filter(s => !/^libs\/|^apps\/|^tools\/|\.(ts|scss|html|json|md|mjs|cjs|js|svg|png|txt|yml|yaml|ico|csproj|cs)$/i.test(s));
  console.log('TOTAL plan entries:', plan.length);
  console.log('--- non-file-looking entries ---');
  console.log(nonFile.slice(0, 60).join('\n'));
})().catch(e => console.error('ERR', e && e.message));
