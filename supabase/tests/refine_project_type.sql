begin;
select plan(1);
select is(
  enum_range(null::public.project_type)::text,
  '{EXPLORE,BUILD,REFINE}',
  'Project types include EXPLORE, BUILD and REFINE'
);
select * from finish();
rollback;
