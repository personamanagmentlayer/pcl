# Oracle Database Expert — Implementation Examples

Reference material for the `oracle-expert` skill. See [SKILL.md](../SKILL.md).

## Implementation Examples

### PL/SQL Package with Complex Logic

```sql
-- Package Specification
CREATE OR REPLACE PACKAGE employee_mgmt AS
    -- Type definitions
    TYPE t_employee_rec IS RECORD (
        emp_id       employees.employee_id%TYPE,
        emp_name     employees.full_name%TYPE,
        department   employees.department_name%TYPE,
        salary       employees.salary%TYPE
    );

    TYPE t_employee_tab IS TABLE OF t_employee_rec;

    -- Public procedures and functions
    FUNCTION get_employee_details(p_emp_id IN NUMBER)
        RETURN t_employee_rec;

    PROCEDURE update_salary(
        p_emp_id     IN NUMBER,
        p_percentage IN NUMBER,
        p_result     OUT VARCHAR2
    );

    FUNCTION calculate_bonus(
        p_emp_id IN NUMBER,
        p_year   IN NUMBER DEFAULT EXTRACT(YEAR FROM SYSDATE)
    ) RETURN NUMBER;

    PROCEDURE bulk_salary_update(
        p_dept_id    IN NUMBER,
        p_percentage IN NUMBER
    );

END employee_mgmt;
/

-- Package Body
CREATE OR REPLACE PACKAGE BODY employee_mgmt AS

    -- Private constants
    c_max_salary_increase CONSTANT NUMBER := 20;
    c_min_salary_increase CONSTANT NUMBER := 1;

    -- Private procedure
    PROCEDURE log_salary_change(
        p_emp_id     IN NUMBER,
        p_old_salary IN NUMBER,
        p_new_salary IN NUMBER
    ) IS
        PRAGMA AUTONOMOUS_TRANSACTION;
    BEGIN
        INSERT INTO salary_audit_log (
            employee_id,
            old_salary,
            new_salary,
            change_date,
            changed_by
        ) VALUES (
            p_emp_id,
            p_old_salary,
            p_new_salary,
            SYSDATE,
            USER
        );
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END log_salary_change;

    -- Public function implementation
    FUNCTION get_employee_details(p_emp_id IN NUMBER)
        RETURN t_employee_rec
    IS
        v_employee t_employee_rec;
    BEGIN
        SELECT
            employee_id,
            first_name || ' ' || last_name,
            department_name,
            salary
        INTO v_employee
        FROM employees e
        JOIN departments d ON e.department_id = d.department_id
        WHERE e.employee_id = p_emp_id;

        RETURN v_employee;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20001,
                'Employee ' || p_emp_id || ' not found');
        WHEN TOO_MANY_ROWS THEN
            RAISE_APPLICATION_ERROR(-20002,
                'Multiple records found for employee ' || p_emp_id);
    END get_employee_details;

    -- Public procedure implementation
    PROCEDURE update_salary(
        p_emp_id     IN NUMBER,
        p_percentage IN NUMBER,
        p_result     OUT VARCHAR2
    ) IS
        v_old_salary employees.salary%TYPE;
        v_new_salary employees.salary%TYPE;
        v_emp_name   VARCHAR2(200);
    BEGIN
        -- Validate percentage
        IF p_percentage NOT BETWEEN c_min_salary_increase AND c_max_salary_increase THEN
            RAISE_APPLICATION_ERROR(-20003,
                'Salary increase must be between ' || c_min_salary_increase ||
                '% and ' || c_max_salary_increase || '%');
        END IF;

        -- Get current salary
        SELECT salary, first_name || ' ' || last_name
        INTO v_old_salary, v_emp_name
        FROM employees
        WHERE employee_id = p_emp_id
        FOR UPDATE NOWAIT;

        -- Calculate new salary
        v_new_salary := v_old_salary * (1 + p_percentage/100);

        -- Update salary
        UPDATE employees
        SET salary = v_new_salary,
            last_updated = SYSDATE,
            updated_by = USER
        WHERE employee_id = p_emp_id;

        -- Log the change
        log_salary_change(p_emp_id, v_old_salary, v_new_salary);

        p_result := 'SUCCESS: Updated salary for ' || v_emp_name ||
                    ' from ' || v_old_salary || ' to ' || v_new_salary;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            p_result := 'ERROR: Employee not found';
            ROLLBACK;
        WHEN OTHERS THEN
            p_result := 'ERROR: ' || SQLERRM;
            ROLLBACK;
            RAISE;
    END update_salary;

    -- Calculate performance bonus
    FUNCTION calculate_bonus(
        p_emp_id IN NUMBER,
        p_year   IN NUMBER DEFAULT EXTRACT(YEAR FROM SYSDATE)
    ) RETURN NUMBER
    IS
        v_salary           employees.salary%TYPE;
        v_performance      NUMBER;
        v_bonus            NUMBER;
        v_dept_avg         NUMBER;
    BEGIN
        -- Get employee salary and performance rating
        SELECT
            e.salary,
            NVL(pr.rating, 0)
        INTO
            v_salary,
            v_performance
        FROM employees e
        LEFT JOIN performance_reviews pr ON
            e.employee_id = pr.employee_id
            AND EXTRACT(YEAR FROM pr.review_date) = p_year
        WHERE e.employee_id = p_emp_id;

        -- Calculate bonus based on performance
        v_bonus := CASE
            WHEN v_performance >= 4.5 THEN v_salary * 0.15  -- 15% bonus
            WHEN v_performance >= 3.5 THEN v_salary * 0.10  -- 10% bonus
            WHEN v_performance >= 2.5 THEN v_salary * 0.05  -- 5% bonus
            ELSE 0
        END;

        RETURN ROUND(v_bonus, 2);
    END calculate_bonus;

    -- Bulk salary update for department
    PROCEDURE bulk_salary_update(
        p_dept_id    IN NUMBER,
        p_percentage IN NUMBER
    ) IS
        TYPE t_emp_id_tab IS TABLE OF employees.employee_id%TYPE;
        TYPE t_salary_tab IS TABLE OF employees.salary%TYPE;

        v_emp_ids    t_emp_id_tab;
        v_old_salaries t_salary_tab;
        v_new_salaries t_salary_tab;
        v_count      NUMBER := 0;
    BEGIN
        -- Bulk collect employee data
        SELECT employee_id, salary
        BULK COLLECT INTO v_emp_ids, v_old_salaries
        FROM employees
        WHERE department_id = p_dept_id
        AND active_flag = 'Y';

        -- Calculate new salaries
        v_new_salaries := t_salary_tab();
        v_new_salaries.EXTEND(v_emp_ids.COUNT);

        FOR i IN 1..v_emp_ids.COUNT LOOP
            v_new_salaries(i) := v_old_salaries(i) * (1 + p_percentage/100);
        END LOOP;

        -- Bulk update
        FORALL i IN 1..v_emp_ids.COUNT
            UPDATE employees
            SET salary = v_new_salaries(i),
                last_updated = SYSDATE
            WHERE employee_id = v_emp_ids(i);

        v_count := SQL%ROWCOUNT;
        COMMIT;

        DBMS_OUTPUT.PUT_LINE('Updated ' || v_count || ' employees');

    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END bulk_salary_update;

END employee_mgmt;
/
```

### Complex Trigger with Business Logic

```sql
CREATE OR REPLACE TRIGGER employee_audit_trg
    BEFORE INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW
DECLARE
    v_action      VARCHAR2(10);
    v_old_salary  employees.salary%TYPE;
    v_new_salary  employees.salary%TYPE;
BEGIN
    -- Determine action
    IF INSERTING THEN
        v_action := 'INSERT';
        v_new_salary := :NEW.salary;
    ELSIF UPDATING THEN
        v_action := 'UPDATE';
        v_old_salary := :OLD.salary;
        v_new_salary := :NEW.salary;

        -- Validate salary increase
        IF :NEW.salary < :OLD.salary THEN
            RAISE_APPLICATION_ERROR(-20010,
                'Salary cannot be decreased');
        END IF;

        IF (:NEW.salary - :OLD.salary) / :OLD.salary > 0.50 THEN
            RAISE_APPLICATION_ERROR(-20011,
                'Salary increase cannot exceed 50%');
        END IF;
    ELSIF DELETING THEN
        v_action := 'DELETE';
        v_old_salary := :OLD.salary;
    END IF;

    -- Insert audit record
    INSERT INTO employee_audit (
        employee_id,
        action_type,
        old_salary,
        new_salary,
        action_date,
        action_by
    ) VALUES (
        COALESCE(:NEW.employee_id, :OLD.employee_id),
        v_action,
        v_old_salary,
        v_new_salary,
        SYSDATE,
        USER
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE_APPLICATION_ERROR(-20099,
            'Audit trigger failed: ' || SQLERRM);
END;
/
```

### Performance Tuning Query

```sql
-- Query with execution plan analysis
EXPLAIN PLAN FOR
SELECT /*+ PARALLEL(e, 4) */
    d.department_name,
    COUNT(*) as employee_count,
    AVG(e.salary) as avg_salary,
    MAX(e.salary) as max_salary,
    MIN(e.salary) as min_salary
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.hire_date >= ADD_MONTHS(SYSDATE, -60)
AND e.active_flag = 'Y'
GROUP BY d.department_name
HAVING COUNT(*) > 5
ORDER BY avg_salary DESC;

-- View execution plan
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);

-- Optimized version with materialized view
CREATE MATERIALIZED VIEW mv_dept_stats
BUILD IMMEDIATE
REFRESH FAST ON COMMIT
AS
SELECT
    d.department_id,
    d.department_name,
    COUNT(*) as employee_count,
    AVG(e.salary) as avg_salary,
    MAX(e.salary) as max_salary,
    MIN(e.salary) as min_salary,
    MAX(e.hire_date) as latest_hire
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.active_flag = 'Y'
GROUP BY d.department_id, d.department_name;

-- Create index for materialized view
CREATE INDEX idx_mv_dept_stats ON mv_dept_stats(department_id);

-- Query using materialized view
SELECT
    department_name,
    employee_count,
    avg_salary
FROM mv_dept_stats
WHERE latest_hire >= ADD_MONTHS(SYSDATE, -60)
AND employee_count > 5
ORDER BY avg_salary DESC;
```

### RMAN Backup Script

```sql
-- RMAN backup strategy
RMAN TARGET /

-- Configure RMAN settings
CONFIGURE RETENTION POLICY TO RECOVERY WINDOW OF 7 DAYS;
CONFIGURE BACKUP OPTIMIZATION ON;
CONFIGURE DEFAULT DEVICE TYPE TO DISK;
CONFIGURE CONTROLFILE AUTOBACKUP ON;
CONFIGURE CONTROLFILE AUTOBACKUP FORMAT FOR DEVICE TYPE DISK TO
    '/backup/rman/%F';
CONFIGURE DEVICE TYPE DISK PARALLELISM 4;
CONFIGURE CHANNEL DEVICE TYPE DISK FORMAT '/backup/rman/%U';

-- Full database backup
RUN {
    ALLOCATE CHANNEL ch1 DEVICE TYPE DISK;
    ALLOCATE CHANNEL ch2 DEVICE TYPE DISK;
    ALLOCATE CHANNEL ch3 DEVICE TYPE DISK;
    ALLOCATE CHANNEL ch4 DEVICE TYPE DISK;

    BACKUP AS COMPRESSED BACKUPSET
        DATABASE
        PLUS ARCHIVELOG
        TAG 'FULL_BACKUP';

    BACKUP CURRENT CONTROLFILE
        FORMAT '/backup/rman/control_%d_%u_%s_%p';

    DELETE NOPROMPT OBSOLETE;
    DELETE NOPROMPT EXPIRED BACKUP;

    RELEASE CHANNEL ch1;
    RELEASE CHANNEL ch2;
    RELEASE CHANNEL ch3;
    RELEASE CHANNEL ch4;
}

-- Incremental backup (Level 0)
BACKUP INCREMENTAL LEVEL 0 DATABASE;

-- Incremental backup (Level 1)
BACKUP INCREMENTAL LEVEL 1 DATABASE;

-- Validate backup
VALIDATE BACKUPSET;

-- List backups
LIST BACKUP SUMMARY;
```
