import os
import yaml
from datetime import datetime

import pandas as pd
import psycopg2
from sshtunnel import SSHTunnelForwarder

faulty_measurements = """SELECT measurement.measurement_start_time AS measurement_start_time,
    measurement.test_runtime AS test_runtime,
    vanilla_tor.tor_log->-1->'t' AS tor_runtime,
  measurement.id AS m_id, measurement.report_no AS m_report_no,
  report.report_id AS report_id,
  report.probe_cc AS probe_cc,
  report.probe_asn AS probe_asn,
  report.test_name AS test_name,
  report.test_start_time AS test_start_time,
  report.report_no AS report_no,
  vanilla_tor.timeout AS tor_timeout,
  vanilla_tor.tor_version AS tor_version,
  vanilla_tor.tor_progress_summary AS tor_progress_summary,
  vanilla_tor.tor_progress_tag AS tor_progress_tag,
  vanilla_tor.tor_progress AS tor_progress,
  vanilla_tor.success AS tor_success,
  vanilla_tor.error AS tor_error,
  vanilla_tor.tor_log AS tor_log
FROM vanilla_tor
JOIN measurement ON vanilla_tor.msm_no = measurement.msm_no
JOIN report ON report.report_no = measurement.report_no
WHERE test_runtime > 400;
"""


stats_last_six_months = """SELECT
probe_cc,
probe_asn_count,
success_count,
failure_count,
total_count,
ROUND(
	(CAST(success_count AS FLOAT) / CAST(total_count AS FLOAT))::numeric
	, 3) AS success_perc,
test_runtime_avg,
test_runtime_min,
test_runtime_max
FROM (
	SELECT AVG(
		GREATEST(
			LEAST(measurement.test_runtime, vanilla_tor.timeout),
			0
		)) AS test_runtime_avg, -- I do this to overcome some bugs in few measurements that have a very high runtime or a negative runtime
	  MIN(measurement.test_runtime) AS test_runtime_min,
	  MAX(measurement.test_runtime) AS test_runtime_max,
	  report.probe_cc AS probe_cc,
	  COUNT(DISTINCT report.probe_asn) AS probe_asn_count,
	  COUNT(CASE WHEN vanilla_tor.success = true THEN 1 END) as success_count,
	  COUNT(CASE WHEN vanilla_tor.success = false THEN 1 END) as failure_count,
	  COUNT(*) as total_count
	FROM vanilla_tor
	JOIN measurement ON vanilla_tor.msm_no = measurement.msm_no 
	JOIN report ON report.report_no = measurement.report_no
	WHERE test_start_time > (now() - interval '6 months')
	GROUP BY probe_cc
) AS vt
"""


by_country_last_six_months = """SELECT measurement.measurement_start_time AS measurement_start_time,
    measurement.test_runtime AS test_runtime,
    vanilla_tor.tor_log->-1->'t' AS tor_runtime,
  report.report_id AS report_id,
  report.probe_cc AS probe_cc,
  report.probe_asn AS probe_asn,
  report.test_name AS test_name,
  report.test_start_time AS test_start_time,
  report.report_no AS report_no,
  vanilla_tor.timeout AS tor_timeout,
  vanilla_tor.tor_version AS tor_version,
  vanilla_tor.tor_progress_summary AS tor_progress_summary,
  vanilla_tor.tor_progress_tag AS tor_progress_tag,
  vanilla_tor.tor_progress AS tor_progress,
  vanilla_tor.success AS tor_success,
  vanilla_tor.error AS tor_error,
  vanilla_tor.tor_log AS tor_log
FROM vanilla_tor
JOIN measurement ON vanilla_tor.msm_no = measurement.msm_no
JOIN report ON report.report_no = measurement.report_no
WHERE test_start_time > (now() - interval '6 months')
"""

def query(q):
    with SSHTunnelForwarder(
        ('hkgmetadb.infra.ooni.io', 22),
        ssh_username='art',
        ssh_private_key=secrets['ssh_private_key_path'],
        remote_bind_address=('localhost', 5432)
    ) as server:
        conn = psycopg2.connect(
            host='localhost',
            port=server.local_bind_port,
            user='shovel',
            password=secrets['shovel_password'],
            dbname='metadb')
    return pd.read_sql_query(q, conn)

def main():
    with open('private/secrets.yml') as in_file:
        secrets = yaml.load(in_file)


if __name__ == "__main__":
    main()
