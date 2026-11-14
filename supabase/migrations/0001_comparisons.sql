create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table documents (
 id uuid primary key default gen_random_uuid(), code text not null unique, title text not null,
 matter text not null, owner text not null, classification text not null default 'confidential' check(classification in ('confidential','internal','public')),
 retention_review_on date, access_review_on date, access_evidence text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table versions (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references documents(id), label text not null,
 filename text not null, file_sha256 text not null check(length(file_sha256)=64), text_sha256 text not null check(length(text_sha256)=64),
 body text not null, extraction text not null, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(document_id,label)
);
create table comparisons (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references documents(id), code text not null unique,
 title text not null, owner text not null, due_on date not null, mode text not null check(mode in ('text','imported-report')),
 original_id uuid references versions(id), revised_id uuid references versions(id),
 revision integer not null default 1, scope_evidence text not null default '', scope_actor text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((mode='text' and original_id is not null and revised_id is not null and original_id<>revised_id) or (mode='imported-report' and original_id is null and revised_id is null))
);
create table changes (
 id uuid primary key default gen_random_uuid(), comparison_id uuid not null references comparisons(id), ordinal integer not null,
 location text not null, kind text not null, before_text text not null default '', after_text text not null default '',
 report_text text not null default '', source_tag text not null default '', source_note text not null default '',
 source_data jsonb not null default '{}', priority text not null default 'normal' check(priority in ('normal','high')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(comparison_id,ordinal)
);
create table decisions (
 id uuid primary key default gen_random_uuid(), change_id uuid not null references changes(id),
 sequence bigint generated always as identity unique, decision text not null check(decision in ('accepted','rejected','hold','open')),
 note text not null check(length(trim(note))>0), actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table signoffs (
 id uuid primary key default gen_random_uuid(), comparison_id uuid not null references comparisons(id), revision integer not null,
 actor text not null, evidence text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(comparison_id,revision)
);
create table activity (
 id uuid primary key default gen_random_uuid(), comparison_id uuid references comparisons(id), document_id uuid references documents(id),
 action text not null, note text not null, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table import_batches (
 id uuid primary key default gen_random_uuid(), comparison_id uuid not null references comparisons(id), source text not null,
 file_sha256 text not null, row_count integer not null, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(source,file_sha256)
);
do $$ declare t text; begin foreach t in array array['documents','versions','comparisons','changes','decisions','signoffs','activity','import_batches'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated_at()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
end loop; end $$;
create view change_register as
 select c.*,p.code comparison,p.owner,p.due_on,d.matter,coalesce(x.decision,'open') decision,coalesce(x.note,'') review_note,coalesce(x.actor,'') reviewer
 from changes c join comparisons p on p.id=c.comparison_id join documents d on d.id=p.document_id
 left join lateral (select decision,note,actor from decisions where change_id=c.id order by sequence desc limit 1) x on true;
create view review_queue as
 select p.id,p.code,p.title,d.matter,p.owner,p.due_on,p.mode,p.revision,
 (select count(*)::int from changes c where c.comparison_id=p.id) changes,
 (select count(*)::int from change_register c where c.comparison_id=p.id and decision in ('open','hold')) unresolved,
 case when exists(select 1 from signoffs s where s.comparison_id=p.id and s.revision=p.revision) then 'signed' else 'review' end status,
 (p.scope_evidence<>'') scope_reviewed,p.updated_at
 from comparisons p join documents d on d.id=p.document_id;
create view attention_queue as
 select code,owner,'overdue' finding,due_on detail from review_queue where status='review' and due_on<current_date
 union all select code,owner,'scope_unchecked',due_on from review_queue where not scope_reviewed
 union all select code,owner,'stale_review',updated_at::date from review_queue where status='review' and updated_at<now()-interval '14 days'
 union all select comparison,owner,'high_priority_unresolved',due_on from change_register where priority='high' and decision in ('open','hold');
create view compliance_findings as
 select code,'NZ-IPP9' rule,'Retention purpose needs review' finding from documents where retention_review_on is null or retention_review_on<=current_date
 union all select code,'NZ-LCCR8','Record access review and confidentiality evidence' from documents where classification='confidential' and (access_review_on is null or access_review_on<current_date-90 or access_evidence='')
 union all select code,'LOCAL-SCOPE','Confirm complete export or compare extracted text against source documents' from comparisons where scope_evidence='';
