-- ----------------------------------------------------------
-- Script MYSQL pour mcd 
-- ----------------------------------------------------------


-- ----------------------------
-- Table: type_prise
-- ----------------------------
CREATE TABLE type_prise (
  type_prise VARCHAR(50) NOT NULL,
  CONSTRAINT type_prise_PK PRIMARY KEY (type_prise)
)ENGINE=InnoDB;


-- ----------------------------
-- Table: enseigne
-- ----------------------------
CREATE TABLE enseigne (
  nom_enseigne VARCHAR(255) NOT NULL,
  CONSTRAINT enseigne_PK PRIMARY KEY (nom_enseigne)
)ENGINE=InnoDB;


-- ----------------------------
-- Table: commune
-- ----------------------------
CREATE TABLE commune (
  code_insee_commune VARCHAR(10) NOT NULL,
  nom_commune VARCHAR(255),
  code_postal VARCHAR(10),
  CONSTRAINT commune_PK PRIMARY KEY (code_insee_commune)
)ENGINE=InnoDB;


-- ----------------------------
-- Table: amenageur
-- ----------------------------
CREATE TABLE amenageur (
  siren_amenageur VARCHAR(14) NOT NULL,
  nom_amenageur VARCHAR(255),
  contact_amenageur VARCHAR(255),
  CONSTRAINT amenageur_PK PRIMARY KEY (siren_amenageur)
)ENGINE=InnoDB;


-- ----------------------------
-- Table: operateur
-- ----------------------------
CREATE TABLE operateur (
  id_operateur INT NOT NULL AUTO_INCREMENT,
  nom_operateur VARCHAR(255),
  contact_operateur VARCHAR(255),
  telephone_operateur VARCHAR(20),
  CONSTRAINT operateur_PK PRIMARY KEY (id_operateur)
)ENGINE=InnoDB;


-- ----------------------------
-- Table: station
-- ----------------------------
CREATE TABLE station (
  id_station_itinerance VARCHAR(50) NOT NULL,
  nom_station VARCHAR(255),
  implantation_station VARCHAR(100),
  adresse_station VARCHAR(255),
  lat FLOAT,
  long FLOAT,
  siren_amenageur VARCHAR(14),
  id_operateur INT,
  nom_enseigne VARCHAR(255),
  code_insee_commune VARCHAR(10) NOT NULL,
  CONSTRAINT station_PK PRIMARY KEY (id_station_itinerance),
  CONSTRAINT station_siren_amenageur_FK FOREIGN KEY (siren_amenageur) REFERENCES amenageur (siren_amenageur),
  CONSTRAINT station_id_operateur_FK FOREIGN KEY (id_operateur) REFERENCES operateur (id_operateur),
  CONSTRAINT station_nom_enseigne_FK FOREIGN KEY (nom_enseigne) REFERENCES enseigne (nom_enseigne),
  CONSTRAINT station_code_insee_commune_FK FOREIGN KEY (code_insee_commune) REFERENCES commune (code_insee_commune)
)ENGINE=InnoDB;


-- ----------------------------
-- Table: point_de_charge
-- ----------------------------
CREATE TABLE point_de_charge (
  id_pdc_itinerance VARCHAR(50) NOT NULL,
  puissance_nominale DECIMAL(8,2),
  gratuit TINYINT(1),
  paiement_cb TINYINT(1),
  tarification VARCHAR(255),
  condition_acces VARCHAR(100),
  accessibilite_pmr VARCHAR(100),
  date_mise_en_service DATE,
  id_station_itinerance VARCHAR(50) NOT NULL,
  CONSTRAINT point_de_charge_PK PRIMARY KEY (id_pdc_itinerance),
  CONSTRAINT point_de_charge_id_station_itinerance_FK FOREIGN KEY (id_station_itinerance) REFERENCES station (id_station_itinerance)
)ENGINE=InnoDB;


-- ----------------------------
-- Table: propose
-- ----------------------------
CREATE TABLE propose (
  type_prise VARCHAR(50) NOT NULL,
  id_pdc_itinerance VARCHAR(50) NOT NULL,
  CONSTRAINT propose_PK PRIMARY KEY (type_prise, id_pdc_itinerance),
  CONSTRAINT propose_type_prise_FK FOREIGN KEY (type_prise) REFERENCES type_prise (type_prise),
  CONSTRAINT propose_id_pdc_itinerance_FK FOREIGN KEY (id_pdc_itinerance) REFERENCES point_de_charge (id_pdc_itinerance)
)ENGINE=InnoDB;

