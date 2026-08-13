begin;
select plan(1);
select hasnt_column('public', 'projects', 'next_review_date', 'projects no longer stores Next Review');
select * from finish();
rollback;
