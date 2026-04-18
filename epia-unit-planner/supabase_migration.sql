-- ============================================================
-- MIGRATION — Colonnes manquantes à ajouter dans Supabase
-- Exécutez ce script dans SQL Editor si votre table existe déjà
-- ============================================================

-- Ajouter la colonne trimestre
alter table unit_plans add column if not exists trimestre text;

-- Supprimer les colonnes "extra" qui n'existent pas dans le formulaire
-- (optionnel — seulement si vous voulez nettoyer)
-- alter table unit_plans drop column if exists evaluations_autre;
-- alter table unit_plans drop column if exists approches_autre;
-- alter table unit_plans drop column if exists langue_apprentissage; -- déjà jsonb
-- alter table unit_plans drop column if exists tdc;
-- alter table unit_plans drop column if exists cas;

-- Vérification : liste toutes les colonnes de la table
select column_name, data_type 
from information_schema.columns 
where table_name = 'unit_plans'
order by ordinal_position;
