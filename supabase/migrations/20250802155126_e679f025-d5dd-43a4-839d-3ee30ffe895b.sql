UPDATE cron.job 
SET schedule = '0 8 * * *' 
WHERE jobname LIKE '%daily-nps%';