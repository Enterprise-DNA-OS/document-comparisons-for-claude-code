insert into documents(id,code,title,matter,owner,retention_review_on,access_review_on,access_evidence) values
 ('10000000-0000-4000-8000-000000000001','DOC-101','Supply agreement','Harbour supply renewal','Mara Chen',current_date+180,current_date,'Demo access review'),
 ('10000000-0000-4000-8000-000000000002','DOC-102','Supply schedule','Harbour delivery terms','Ari Morgan',current_date-2,null,''),
 ('10000000-0000-4000-8000-000000000003','DOC-103','Warehouse licence','Depot occupancy','Mara Chen',current_date+90,current_date,'Demo access review')
 on conflict(code) do nothing;
